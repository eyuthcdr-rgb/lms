import { Router } from 'express';
import Subject from '../models/Subject.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const subjects = await Subject.find().sort('order name');
  res.json(subjects);
});

router.post('/', telegramAuth, requireAdmin, upload.single('cover'), async (req, res) => {
  const { name, description, icon, color, order, requiresApproval } = req.body;
  const subject = await Subject.create({
    name, description, icon, color,
    order: order || 0,
    coverUrl: req.file?.path || '',
    requiresApproval: requiresApproval !== 'false',
  });
  res.status(201).json(subject);
});

router.put('/:id', telegramAuth, requireAdmin, upload.single('cover'), async (req, res) => {
  const update = { ...req.body };
  if (req.file) update.coverUrl = req.file.path;
  const subject = await Subject.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!subject) return res.status(404).json({ error: 'Not found' });
  res.json(subject);
});

router.delete('/:id', telegramAuth, requireAdmin, async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
