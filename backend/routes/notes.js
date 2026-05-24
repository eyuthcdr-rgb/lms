import { Router } from 'express';
import Note from '../models/Note.js';
import User from '../models/User.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const filter = req.query.subject ? { subject: req.query.subject } : {};
  const notes = await Note.find(filter).sort('-pinned -createdAt').populate('subject', 'name');
  res.json(notes);
});

router.get('/:id', telegramAuth, requireApproved, async (req, res) => {
  const note = await Note.findById(req.params.id).populate('subject', 'name icon');
  if (!note) return res.status(404).json({ error: 'Not found' });

  // Mark as completed
  await User.findOneAndUpdate(
    { telegramId: req.dbUser.telegramId },
    { $addToSet: { completedLessons: note._id } }
  );
  res.json(note);
});

router.post('/', telegramAuth, requireAdmin, upload.single('file'), async (req, res) => {
  const { subject, title, content, chapter, pinned } = req.body;
  const note = await Note.create({
    subject, title, content,
    chapter: chapter || '',
    pinned: pinned === 'true',
    fileUrl: req.file?.path || '',
    fileName: req.file?.originalname || '',
    fileType: req.file ? (req.file.mimetype.includes('pdf') ? 'pdf' : 'image') : '',
    addedBy: req.dbUser.telegramId,
  });
  res.status(201).json(note);
});

router.put('/:id', telegramAuth, requireAdmin, upload.single('file'), async (req, res) => {
  const update = { ...req.body };
  if (req.file) {
    update.fileUrl  = req.file.path;
    update.fileName = req.file.originalname;
    update.fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
  }
  const note = await Note.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

router.delete('/:id', telegramAuth, requireAdmin, async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
