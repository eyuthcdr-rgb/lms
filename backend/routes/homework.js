import { Router } from 'express';
import Homework from '../models/Homework.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const filter = req.query.subject ? { subject: req.query.subject } : {};
  const homework = await Homework.find(filter).sort('-createdAt').populate('subject', 'name');
  res.json(homework);
});

router.get('/:id', telegramAuth, requireApproved, async (req, res) => {
  const hw = await Homework.findById(req.params.id).populate('subject', 'name icon');
  if (!hw) return res.status(404).json({ error: 'Not found' });
  const mySubmission = await Submission.findOne({ homework: req.params.id, student: req.dbUser.telegramId });
  res.json({ homework: hw, mySubmission: mySubmission || null });
});

router.post('/', telegramAuth, requireAdmin, upload.single('file'), async (req, res) => {
  const { subject, title, description, dueDate } = req.body;
  const hw = await Homework.create({
    subject, title, description,
    dueDate: dueDate ? new Date(dueDate) : null,
    fileUrl: req.file?.path || '',
    fileName: req.file?.originalname || '',
    fileType: req.file ? (req.file.mimetype.includes('pdf') ? 'pdf' : 'image') : '',
    addedBy: req.dbUser.telegramId,
  });
  res.status(201).json(hw);
});

router.put('/:id', telegramAuth, requireAdmin, upload.single('file'), async (req, res) => {
  const update = { ...req.body };
  if (req.file) {
    update.fileUrl  = req.file.path;
    update.fileName = req.file.originalname;
    update.fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
  }
  const hw = await Homework.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!hw) return res.status(404).json({ error: 'Not found' });
  res.json(hw);
});

router.delete('/:id', telegramAuth, requireAdmin, async (req, res) => {
  await Homework.findByIdAndDelete(req.params.id);
  await Submission.deleteMany({ homework: req.params.id });
  res.json({ ok: true });
});

router.post('/:id/submit', telegramAuth, requireApproved, upload.single('file'), async (req, res) => {
  const existing = await Submission.findOne({ homework: req.params.id, student: req.dbUser.telegramId });
  if (existing) return res.status(400).json({ error: 'Already submitted.' });
  const user = await User.findOne({ telegramId: req.dbUser.telegramId });
  const sub = await Submission.create({
    homework: req.params.id,
    student: req.dbUser.telegramId,
    studentName: user?.fullName || user?.firstName || '',
    fileUrl: req.file?.path || '',
    fileType: req.file ? (req.file.mimetype.includes('pdf') ? 'pdf' : 'image') : '',
    note: req.body.note || '',
  });
  res.status(201).json(sub);
});

router.get('/:id/submissions', telegramAuth, requireAdmin, async (req, res) => {
  const subs = await Submission.find({ homework: req.params.id }).sort('-submittedAt');
  res.json(subs);
});

router.patch('/submissions/:subId/grade', telegramAuth, requireAdmin, async (req, res) => {
  const sub = await Submission.findByIdAndUpdate(req.params.subId, { ...req.body, status: 'graded' }, { new: true });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json(sub);
});

export default router;
