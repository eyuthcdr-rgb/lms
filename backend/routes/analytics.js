import { Router } from 'express';
import User from '../models/User.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Submission from '../models/Submission.js';
import Homework from '../models/Homework.js';
import Subject from '../models/Subject.js';
import Note from '../models/Note.js';
import Video from '../models/Video.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Student dashboard stats
router.get('/me', telegramAuth, requireApproved, async (req, res) => {
  const tid = req.dbUser.telegramId;
  const user = await User.findOne({ telegramId: tid });
  const [attempts, submissions, allHW] = await Promise.all([
    QuizAttempt.find({ student: tid, status: 'submitted' }).populate('quiz', 'title subject').sort('-submittedAt'),
    Submission.find({ student: tid }).populate('homework', 'title dueDate'),
    Homework.find(),
  ]);
  const submittedHWIds = submissions.map(s => String(s.homework?._id));
  const pending = allHW.filter(h => !submittedHWIds.includes(String(h._id)));
  const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : 0;
  res.json({
    quizzesTaken: attempts.length,
    averageScore: avgScore,
    pendingHomework: pending.length,
    gradedWork: submissions.filter(s => s.status === 'graded').length,
    completedLessons: user?.completedLessons?.length || 0,
    completedVideos: user?.completedVideos?.length || 0,
    recentAttempts: attempts.slice(0, 5),
    attempts, // full list for drill-down
    submissions,
    pendingList: pending,
  });
});

// Admin dashboard stats
router.get('/admin', telegramAuth, requireAdmin, async (req, res) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalStudents, activeUsers, pendingApproval, allAttempts, pendingSubmissions, subjects] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.find({ role: 'student', lastSeen: { $gte: oneDayAgo } }).select('fullName firstName username telegramId lastSeen profilePicUrl'),
    User.find({ status: 'pending' }).select('fullName firstName username telegramId createdAt'),
    QuizAttempt.find({ status: 'submitted' }).populate('quiz', 'title'),
    Submission.find({ status: 'submitted' }).populate('homework', 'title'),
    Subject.find().select('name'),
  ]);
  const avgScore = allAttempts.length ? Math.round(allAttempts.reduce((s, a) => s + a.percentage, 0) / allAttempts.length) : 0;

  // Top scorers
  const scoreMap = {};
  allAttempts.forEach(a => {
    if (!scoreMap[a.student]) scoreMap[a.student] = { scores: [], name: a.studentName };
    scoreMap[a.student].scores.push(a.percentage);
  });
  const leaderboard = Object.entries(scoreMap).map(([tid, d]) => ({
    telegramId: tid, name: d.name,
    avg: Math.round(d.scores.reduce((s, n) => s + n, 0) / d.scores.length),
    attempts: d.scores.length,
  })).sort((a, b) => b.avg - a.avg).slice(0, 10);

  res.json({
    totalStudents,
    activeToday: activeUsers.length,
    activeUsers, // drill-down
    pendingApproval: pendingApproval.length,
    pendingList: pendingApproval, // drill-down
    averageQuizScore: avgScore,
    totalQuizzesTaken: allAttempts.length,
    pendingSubmissions: pendingSubmissions.length,
    pendingSubmissionsList: pendingSubmissions, // drill-down
    totalSubjects: subjects.length,
    leaderboard,
    allAttempts,
  });
});

// Reminders for student - due dates and new materials
router.get('/reminders', telegramAuth, requireApproved, async (req, res) => {
  const user = await User.findOne({ telegramId: req.dbUser.telegramId });
  const enrolledIds = user?.enrolledCourses || [];
  const now = new Date();
  const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [dueSoon, newNotes, newVideos, newSubjects] = await Promise.all([
    Homework.find({ subject: { $in: enrolledIds }, dueDate: { $gte: now, $lte: threeDaysAhead } }).populate('subject', 'name icon'),
    Note.find({ subject: { $in: enrolledIds }, createdAt: { $gte: oneDayAgo } }).populate('subject', 'name'),
    Video.find({ subject: { $in: enrolledIds }, createdAt: { $gte: oneDayAgo } }).populate('subject', 'name'),
    Subject.find({ createdAt: { $gte: oneDayAgo } }),
  ]);

  const reminders = [];
  dueSoon.forEach(hw => reminders.push({ type: 'due', title: `📋 Due Soon: ${hw.title}`, subtitle: `${hw.subject?.name} — ${new Date(hw.dueDate).toLocaleDateString()}`, urgent: new Date(hw.dueDate) - now < 24 * 60 * 60 * 1000 }));
  newNotes.forEach(n => reminders.push({ type: 'new_note', title: `📝 New Note: ${n.title}`, subtitle: n.subject?.name }));
  newVideos.forEach(v => reminders.push({ type: 'new_video', title: `🎬 New Video: ${v.title}`, subtitle: v.subject?.name }));
  newSubjects.forEach(s => reminders.push({ type: 'new_subject', title: `📚 New Subject: ${s.name}`, subtitle: 'Tap to enroll' }));

  res.json(reminders);
});

export default router;
