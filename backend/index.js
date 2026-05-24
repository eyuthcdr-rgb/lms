import 'express-async-errors';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Bot, webhookCallback, InlineKeyboard } from 'grammy';

import User        from './models/User.js';
import userRoutes  from './routes/users.js';
import subjectRoutes from './routes/subjects.js';
import noteRoutes  from './routes/notes.js';
import videoRoutes from './routes/videos.js';
import quizRoutes  from './routes/quizzes.js';
import homeworkRoutes from './routes/homework.js';
import questionRoutes from './routes/questions.js';
import enrollmentRoutes from './routes/enrollments.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/users',       userRoutes);
app.use('/api/subjects',    subjectRoutes);
app.use('/api/notes',       noteRoutes);
app.use('/api/videos',      videoRoutes);
app.use('/api/quizzes',     quizRoutes);
app.use('/api/homework',    homeworkRoutes);
app.use('/api/questions',   questionRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const bot = new Bot(process.env.BOT_TOKEN);
const regState = new Map();

async function sendAppButton(ctx, user) {
  const kb = new InlineKeyboard().webApp('📚 Open Learning Platform', process.env.FRONTEND_URL);
  await ctx.reply(`Welcome back, *${user.fullName || user.firstName}*! 🎓`, { reply_markup: kb, parse_mode: 'Markdown' });
}

async function notifyAdmin(text) {
  try { await bot.api.sendMessage(process.env.ADMIN_CHAT_ID, text, { parse_mode: 'Markdown' }); }
  catch (e) { console.error('Admin notify:', e.message); }
}

bot.command('start', async (ctx) => {
  const tg = ctx.from;
  let user = await User.findOne({ telegramId: tg.id });
  if (user?.status === 'blocked') return ctx.reply('❌ Your access has been blocked.');
  if (user?.regStep === 'done' && user?.status === 'approved') return sendAppButton(ctx, user);
  if (user?.regStep === 'done' && user?.status === 'pending') return ctx.reply(`👋 Hi *${user.fullName}*! Pending admin approval. ⏳`, { parse_mode: 'Markdown' });
  if (!user) user = await User.create({ telegramId: tg.id, username: tg.username || '', firstName: tg.first_name || '', lastName: tg.last_name || '' });
  regState.set(tg.id, 'awaiting_name');
  await ctx.reply(`👋 Welcome! Let's set up your profile.\n\n*Step 1 of 3* — Enter your *Full Name*:`, { parse_mode: 'Markdown' });
});

bot.command('profile', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user || user.status !== 'approved') return ctx.reply('❌ Approved account required.');
  const kb = new InlineKeyboard().webApp('👤 View Profile', `${process.env.FRONTEND_URL}/profile`);
  const text = `👤 *${user.fullName || user.firstName}*\n🎓 ${user.academicLevel || 'Level not set'}\n📅 Joined: ${user.createdAt.toDateString()}`;
  if (user.profilePicUrl) await ctx.replyWithPhoto(user.profilePicUrl, { caption: text, parse_mode: 'Markdown', reply_markup: kb });
  else await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
});

bot.command('dashboard', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user || user.status !== 'approved') return ctx.reply('❌ Approved account required.');
  const kb = new InlineKeyboard().webApp('📊 Dashboard', `${process.env.FRONTEND_URL}/dashboard`);
  await ctx.reply('📊 *Your Learning Dashboard*', { parse_mode: 'Markdown', reply_markup: kb });
});

bot.command('feedback', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user || user.status !== 'approved') return ctx.reply('❌ Approved account required.');
  regState.set(ctx.from.id, 'awaiting_feedback');
  await ctx.reply(`💬 Send your feedback — text or photo:`, { parse_mode: 'Markdown' });
});

bot.command('approve', async (ctx) => {
  if (String(ctx.from.id) !== String(process.env.ADMIN_CHAT_ID)) return ctx.reply('❌ Admin only.');
  const targetId = Number(ctx.message.text.split(' ')[1]);
  if (!targetId) return ctx.reply('Usage: /approve <id>');
  const user = await User.findOneAndUpdate({ telegramId: targetId }, { status: 'approved' }, { new: true });
  if (!user) return ctx.reply('❌ User not found.');
  let invite = '';
  try { const l = await bot.api.createChatInviteLink(process.env.GROUP_CHAT_ID, { member_limit: 1 }); invite = `\n\n🔗 ${l.invite_link}`; } catch {}
  const kb = new InlineKeyboard().webApp('📚 Open Platform', process.env.FRONTEND_URL);
  await bot.api.sendMessage(targetId, `✅ Approved! Welcome ${user.fullName || user.firstName}! 🎉${invite}`, { reply_markup: kb });
  ctx.reply(`✅ Approved ${user.fullName || user.firstName}`);
});

bot.command('block',   async (ctx) => {
  if (String(ctx.from.id) !== String(process.env.ADMIN_CHAT_ID)) return;
  const id = Number(ctx.message.text.split(' ')[1]);
  const u = await User.findOneAndUpdate({ telegramId: id }, { status: 'blocked' }, { new: true });
  ctx.reply(u ? `🚫 Blocked ${u.fullName || u.firstName}` : '❌ Not found');
});

bot.command('unblock', async (ctx) => {
  if (String(ctx.from.id) !== String(process.env.ADMIN_CHAT_ID)) return;
  const id = Number(ctx.message.text.split(' ')[1]);
  const u = await User.findOneAndUpdate({ telegramId: id }, { status: 'approved' }, { new: true });
  ctx.reply(u ? `✅ Unblocked ${u.fullName || u.firstName}` : '❌ Not found');
});

bot.command('students', async (ctx) => {
  if (String(ctx.from.id) !== String(process.env.ADMIN_CHAT_ID)) return;
  const users = await User.find({ role: 'student' }).sort('-createdAt').limit(20);
  ctx.reply(users.length ? `*Students:*\n${users.map(u => `• ${u.fullName || u.firstName} — ${u.status} [${u.telegramId}]`).join('\n')}` : 'No students yet.', { parse_mode: 'Markdown' });
});

bot.on('message', async (ctx) => {
  const tg = ctx.from;
  const text = ctx.message.text;
  const photo = ctx.message.photo;
  const state = regState.get(tg.id);

  if (state === 'awaiting_feedback') {
    regState.delete(tg.id);
    let fileUrl = '';
    if (photo) { const f = await bot.api.getFile(photo[photo.length-1].file_id); fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${f.file_path}`; }
    await User.findOneAndUpdate({ telegramId: tg.id }, { $push: { feedbackHistory: { text: text || '', fileUrl } } });
    const user = await User.findOne({ telegramId: tg.id });
    await notifyAdmin(`💬 *Feedback from ${user?.fullName || tg.first_name}*\n@${tg.username || 'none'} (${tg.id})\n\n${text || '(photo)'}`);
    return ctx.reply('✅ Feedback sent! Thank you.');
  }

  const user = await User.findOne({ telegramId: tg.id });
  if (!user) return;
  const step = state || user.regStep;

  if (step === 'awaiting_name') {
    if (!text || text.startsWith('/')) return;
    await User.findOneAndUpdate({ telegramId: tg.id }, { fullName: text.trim(), regStep: 'awaiting_level' });
    regState.set(tg.id, 'awaiting_level');
    return ctx.reply(`✅ Hi *${text.trim()}*!\n\n*Step 2 of 3* — Your Academic Level?\n\nExamples: "Grade 10", "Year 2 University"`, { parse_mode: 'Markdown' });
  }
  if (step === 'awaiting_level') {
    if (!text || text.startsWith('/')) return;
    await User.findOneAndUpdate({ telegramId: tg.id }, { academicLevel: text.trim(), regStep: 'awaiting_photo' });
    regState.set(tg.id, 'awaiting_photo');
    return ctx.reply(`✅ Got it!\n\n*Step 3 of 3* — Send your profile photo\n\nOr /skip for default avatar.`, { parse_mode: 'Markdown' });
  }
  if (step === 'awaiting_photo') {
    let profilePicUrl = '';
    if (photo) { const f = await bot.api.getFile(photo[photo.length-1].file_id); profilePicUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${f.file_path}`; }
    else if (!text?.startsWith('/')) return ctx.reply('Please send a photo or /skip');
    const updated = await User.findOneAndUpdate({ telegramId: tg.id }, { profilePicUrl, regStep: 'done' }, { new: true });
    regState.delete(tg.id);
    await notifyAdmin(`📬 *New Student*\n\n👤 ${updated.fullName}\n🎓 ${updated.academicLevel}\n@${tg.username || 'none'} (${tg.id})\n\n/approve ${tg.id}`);
    return ctx.reply(`🎉 *Registration complete!*\n\nPending admin approval. We'll notify you! ⏳`, { parse_mode: 'Markdown' });
  }
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await User.findOneAndUpdate({ telegramId: Number(process.env.ADMIN_CHAT_ID) }, { role: 'admin', status: 'approved', regStep: 'done' }, { upsert: true });
    if (process.env.NODE_ENV === 'production') {
      const path = `/bot${process.env.BOT_TOKEN}`;
      app.use(path, webhookCallback(bot, 'express'));
      app.listen(PORT, () => { console.log(`🚀 Port ${PORT}`); bot.api.setWebhook(`${process.env.BACKEND_URL}${path}`).then(() => console.log('✅ Webhook set')); });
    } else {
      app.listen(PORT, () => console.log(`🚀 Dev http://localhost:${PORT}`));
      bot.start(); console.log('🤖 Polling');
    }
  }).catch(err => { console.error('❌ DB:', err); process.exit(1); });
