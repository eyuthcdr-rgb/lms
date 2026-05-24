import { Router } from 'express';
import User from '../models/User.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Submission from '../models/Submission.js';
import Enrollment from '../models/Enrollment.js';
import { telegramAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/me', telegramAuth, async (req, res) => {
  await User.findOneAndUpdate({ telegramId: req.dbUser.telegramId }, { lastSeen: new Date() });
  res.json(req.dbUser);
});

router.put('/me', telegramAuth, upload.single('profilePic'), async (req, res) => {
  const update = {};
  if (req.body.fullName)      update.fullName      = req.body.fullName;
  if (req.body.academicLevel) update.academicLevel = req.body.academicLevel;
  if (req.body.bio)           update.bio           = req.body.bio;
  if (req.file)               update.profilePicUrl = req.file.path;
  const user = await User.findOneAndUpdate({ telegramId: req.dbUser.telegramId }, update, { new: true });
  res.json(user);
});

router.post('/feedback', telegramAuth, upload.single('file'), async (req, res) => {
  const { text } = req.body;
  const feedbackEntry = {
    text: text || '',
    fileUrl: req.file?.path || '',
    fileType: req.file ? (req.file.mimetype.includes('pdf') ? 'pdf' : 'image') : '',
  };
  await User.findOneAndUpdate(
    { telegramId: req.dbUser.telegramId },
    { $push: { feedbackHistory: feedbackEntry } }
  );
  res.json({ ok: true });
});

router.get('/', telegramAuth, requireAdmin, async (req, res) => {
  const page   = parseInt(req.query.page || '1');
  const limit  = parseInt(req.query.limit || '20');
  const search = req.query.search || '';
  const filter = search ? { $or: [
    { fullName: { $regex: search, $options: 'i' } },
    { firstName: { $regex: search, $options: 'i' } },
    { username: { $regex: search, $options: 'i' } },
  ]} : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page-1)*limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, page, pages: Math.ceil(total/limit) });
});

// Full student profile for admin - includes quiz attempts and submissions
router.get('/:telegramId/full', telegramAuth, requireAdmin, async (req, res) => {
  const tid = Number(req.params.telegramId);
  const [user, attempts, submissions, enrollments] = await Promise.all([
    User.findOne({ telegramId: tid }),
    QuizAttempt.find({ student: tid, status: 'submitted' }).populate('quiz', 'title subject').sort('-submittedAt'),
    Submission.find({ student: tid }).populate('homework', 'title subject dueDate').sort('-submittedAt'),
    Enrollment.find({ student: tid }).populate('subject', 'name icon color'),
  ]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
    : 0;
  res.json({ user, attempts, submissions, enrollments, avgScore });
});

router.patch('/:telegramId/approve', telegramAuth, requireAdmin, async (req, res) => {
  const user = await User.findOneAndUpdate({ telegramId: Number(req.params.telegramId) }, { status: 'approved' }, { new: true });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.patch('/:telegramId/block', telegramAuth, requireAdmin, async (req, res) => {
  const user = await User.findOneAndUpdate({ telegramId: Number(req.params.telegramId) }, { status: 'blocked' }, { new: true });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.patch('/:telegramId/unblock', telegramAuth, requireAdmin, async (req, res) => {
  const user = await User.findOneAndUpdate({ telegramId: Number(req.params.telegramId) }, { status: 'approved' }, { new: true });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// Get all feedbacks (admin)
router.get('/all/feedbacks', telegramAuth, requireAdmin, async (req, res) => {
  const users = await User.find({ 'feedbackHistory.0': { $exists: true } }).select('fullName firstName username telegramId feedbackHistory');
  const feedbacks = [];
  users.forEach(u => {
    u.feedbackHistory.forEach(f => {
      feedbacks.push({ ...f.toObject(), studentName: u.fullName || u.firstName, username: u.username, telegramId: u.telegramId });
    });
  });
  feedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(feedbacks);
});

export default router;
