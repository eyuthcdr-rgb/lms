import { Router } from 'express';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const filter = req.query.subject ? { subject: req.query.subject } : {};
  const questions = await Question.find(filter).sort('-isPinned -createdAt');
  res.json(questions);
});

router.post('/', telegramAuth, requireApproved, upload.single('image'), async (req, res) => {
  const { subject, text } = req.body;
  const user = await User.findOne({ telegramId: req.dbUser.telegramId });
  const q = await Question.create({
    subject, text,
    askedBy: req.dbUser.telegramId,
    askerName: user?.fullName || user?.firstName || 'Student',
    imageUrl: req.file?.path || '',
  });
  res.status(201).json(q);
});

router.post('/:id/answer', telegramAuth, requireApproved, async (req, res) => {
  const { text } = req.body;
  const user = await User.findOne({ telegramId: req.dbUser.telegramId });
  const q = await Question.findByIdAndUpdate(
    req.params.id,
    { $push: { answers: { answeredBy: req.dbUser.telegramId, answererName: user?.fullName || user?.firstName, text, isAdmin: req.dbUser.role === 'admin' } } },
    { new: true }
  );
  res.json(q);
});

router.patch('/:id/pin', telegramAuth, requireAdmin, async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, { isPinned: true }, { new: true });
  res.json(q);
});

router.patch('/:id/resolve', telegramAuth, requireAdmin, async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, { isResolved: true }, { new: true });
  res.json(q);
});

router.patch('/:id/answers/:aid/pin', telegramAuth, requireAdmin, async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  const a = q.answers.id(req.params.aid);
  if (a) a.isPinned = true;
  await q.save();
  res.json(q);
});

router.delete('/:id', telegramAuth, requireAdmin, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
