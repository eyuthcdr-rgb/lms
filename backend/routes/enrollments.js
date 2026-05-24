import { Router } from 'express';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Student requests enrollment
router.post('/request', telegramAuth, requireApproved, async (req, res) => {
  const { subjectId } = req.body;
  const subject = await Subject.findById(subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  const user = await User.findOne({ telegramId: req.dbUser.telegramId });

  // Check already enrolled
  if (user.enrolledCourses?.some(id => String(id) === String(subjectId))) {
    return res.status(400).json({ error: 'Already enrolled' });
  }

  // Check pending
  const existing = await Enrollment.findOne({ student: req.dbUser.telegramId, subject: subjectId, status: 'pending' });
  if (existing) return res.status(400).json({ error: 'Request already pending' });

  // If no approval needed, enroll directly
  if (!subject.requiresApproval) {
    await User.findOneAndUpdate(
      { telegramId: req.dbUser.telegramId },
      { $addToSet: { enrolledCourses: subjectId } }
    );
    await Enrollment.create({ student: req.dbUser.telegramId, studentName: user?.fullName || user?.firstName, subject: subjectId, status: 'approved', resolvedAt: new Date() });
    return res.json({ enrolled: true });
  }

  const enroll = await Enrollment.create({
    student: req.dbUser.telegramId,
    studentName: user?.fullName || user?.firstName || '',
    subject: subjectId,
  });
  res.json(enroll);
});

// Get my enrollments
router.get('/mine', telegramAuth, requireApproved, async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.dbUser.telegramId }).populate('subject', 'name icon color');
  res.json(enrollments);
});

// Admin: get all pending enrollments
router.get('/pending', telegramAuth, requireAdmin, async (req, res) => {
  const enrollments = await Enrollment.find({ status: 'pending' }).populate('subject', 'name icon').sort('-createdAt');
  res.json(enrollments);
});

// Admin: approve enrollment
router.patch('/:id/approve', telegramAuth, requireAdmin, async (req, res) => {
  const enroll = await Enrollment.findByIdAndUpdate(req.params.id, { status: 'approved', resolvedAt: new Date() }, { new: true });
  if (!enroll) return res.status(404).json({ error: 'Not found' });
  await User.findOneAndUpdate(
    { telegramId: enroll.student },
    { $addToSet: { enrolledCourses: enroll.subject }, $pull: { pendingCourses: enroll.subject } }
  );
  res.json(enroll);
});

// Admin: reject enrollment
router.patch('/:id/reject', telegramAuth, requireAdmin, async (req, res) => {
  const enroll = await Enrollment.findByIdAndUpdate(req.params.id, { status: 'rejected', resolvedAt: new Date() }, { new: true });
  if (!enroll) return res.status(404).json({ error: 'Not found' });
  res.json(enroll);
});

export default router;
