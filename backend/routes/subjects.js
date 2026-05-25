import { Router } from 'express';
import Subject from '../models/Subject.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET all subjects
router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const subjects = await Subject.find().sort('order name');
  res.json(subjects);
});

// POST create subject — accepts JSON body (no file upload needed for basic subject)
router.post('/', telegramAuth, requireAdmin, async (req, res) => {
  const { name, description, icon, color, order, requiresApproval } = req.body;
  if (!name) return res.status(400).json({ error: 'Subject name is required.' });
  const subject = await Subject.create({
    name,
    description: description || '',
    icon: icon || '📚',
    color: color || '#6C63FF',
    order: order || 0,
    requiresApproval: requiresApproval !== false && requiresApproval !== 'false',
  });
  res.status(201).json(subject);
});

// PUT update subject — accepts JSON body
router.put('/:id', telegramAuth, requireAdmin, async (req, res) => {
  const { name, description, icon, color, order } = req.body;
  const update = {};
  if (name)        update.name        = name;
  if (description !== undefined) update.description = description;
  if (icon)        update.icon        = icon;
  if (color)       update.color       = color;
  if (order)       update.order       = order;
  const subject = await Subject.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!subject) return res.status(404).json({ error: 'Not found' });
  res.json(subject);
});

// DELETE subject
router.delete('/:id', telegramAuth, requireAdmin, async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
