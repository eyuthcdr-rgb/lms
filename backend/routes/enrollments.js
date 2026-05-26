import { Router } from 'express';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Student requests enrollment — prevents duplicates with findOneAndUpdate upsert
router.post('/request', telegramAuth, requireApproved, async (req, res) => {
  const { subjectId } = req.body;
  const subject = await Subject.findById(subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  const user = await User.findOne({ telegramId: req.dbUser.telegramId });

  // Already enrolled
  if (user?.enrolledCourses?.some(id => String(id) === String(subjectId))) {
    return res.status(400).json({ error: 'Already enrolled' });
  }

  // No approval needed — enroll directly
  if (!subject.requiresApproval) {
    await User.findOneAndUpdate(
      { telegramId: req.dbUser.telegramId },
      { $addToSet: { enrolledCourses: subjectId } }
    );
    const enroll = await Enrollment.findOneAndUpdate(
      { student: req.dbUser.telegramId, subject: subjectId },
      { status: 'approved', resolvedAt: new Date(), studentName: user?.fullName || user?.firstName || '' },
      { upsert: true, new: true }
    );
    return res.json({ enrolled: true, enrollment: enroll });
  }

  // Use findOneAndUpdate to prevent duplicate pending requests
  const existing = await Enrollment.findOne({
    student: req.dbUser.telegramId,
    subject: subjectId,
    status: { $in: ['pending', 'approved'] }
  });

  if (existing) {
    return res.status(400).json({ error: existing.status === 'approved' ? 'Already enrolled' : 'Request already pending', status: existing.status });
  }

  // Create new enrollment (or re-create if previously rejected)
  const enroll = await Enrollment.findOneAndUpdate(
    { student: req.dbUser.telegramId, subject: subjectId, status: 'rejected' },
    { status: 'pending', requestedAt: new Date(), studentName: user?.fullName || user?.firstName || '' },
    { upsert: true, new: true }
  );

  res.json(enroll);
});

// Get my enrollments
router.get('/mine', telegramAuth, requireApproved, async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.dbUser.telegramId })
    .populate('subject', 'name icon color description');
  res.json(enrollments);
});

// Admin: pending enrollments
router.get('/pending', telegramAuth, requireAdmin, async (req, res) => {
  const enrollments = await Enrollment.find({ status: 'pending' })
    .populate('subject', 'name icon').sort('-createdAt');
  res.json(enrollments);
});

// Admin: approve
router.patch('/:id/approve', telegramAuth, requireAdmin, async (req, res) => {
  const enroll = await Enrollment.findByIdAndUpdate(
    req.params.id, { status: 'approved', resolvedAt: new Date() }, { new: true }
  );
  if (!enroll) return res.status(404).json({ error: 'Not found' });
  await User.findOneAndUpdate(
    { telegramId: enroll.student },
    { $addToSet: { enrolledCourses: enroll.subject }, $pull: { pendingCourses: enroll.subject } }
  );
  res.json(enroll);
});

// Admin: reject
router.patch('/:id/reject', telegramAuth, requireAdmin, async (req, res) => {
  const enroll = await Enrollment.findByIdAndUpdate(
    req.params.id, { status: 'rejected', resolvedAt: new Date() }, { new: true }
  );
  if (!enroll) return res.status(404).json({ error: 'Not found' });
  res.json(enroll);
});

export default router;
