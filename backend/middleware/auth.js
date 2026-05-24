import crypto from 'crypto';
import User from '../models/User.js';

export async function telegramAuth(req, res, next) {
  try {
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) return res.status(401).json({ error: 'Missing Telegram initData' });

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const checkString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (expectedHash !== hash) return res.status(401).json({ error: 'Invalid Telegram data' });

    const userData = JSON.parse(params.get('user') || '{}');
    req.telegramUser = userData;

    let user = await User.findOne({ telegramId: userData.id });
    if (!user) {
      user = await User.create({
        telegramId: userData.id,
        username: userData.username || '',
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
      });
    }
    await User.findOneAndUpdate({ telegramId: userData.id }, { lastSeen: new Date() });
    req.dbUser = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Auth error', detail: err.message });
  }
}

export function requireApproved(req, res, next) {
  if (!req.dbUser || req.dbUser.status !== 'approved') {
    return res.status(403).json({ error: 'Your account is not approved yet.' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}
