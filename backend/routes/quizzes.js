import { Router } from 'express';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const filter = req.query.subject ? { subject: req.query.subject } : {};
  const quizzes = await Quiz.find(filter).sort('-createdAt').populate('subject', 'name').select('-questions.answer -questions.explanation');
  // Attach attempt count for student
  const tid = req.dbUser.telegramId;
  const quizzesWithAttempts = await Promise.all(quizzes.map(async q => {
    const attempts = await QuizAttempt.countDocuments({ quiz: q._id, student: tid, status: { $in: ['submitted','timed_out'] } });
    return { ...q.toObject(), myAttempts: attempts };
  }));
  res.json(quizzesWithAttempts);
});

router.get('/:id', telegramAuth, requireApproved, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('subject', 'name icon').select('-questions.answer');
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const attempt = await QuizAttempt.findOne({ quiz: req.params.id, student: req.dbUser.telegramId, status: 'in_progress' });
  const doneAttempts = await QuizAttempt.countDocuments({ quiz: req.params.id, student: req.dbUser.telegramId, status: { $in: ['submitted','timed_out'] } });
  res.json({ quiz, attempt: attempt || null, doneAttempts });
});

router.post('/:id/start', telegramAuth, requireApproved, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });

  const doneAttempts = await QuizAttempt.countDocuments({ quiz: req.params.id, student: req.dbUser.telegramId, status: { $in: ['submitted','timed_out'] } });
  if (quiz.maxAttempts > 0 && doneAttempts >= quiz.maxAttempts) {
    return res.status(403).json({ error: `Maximum attempts (${quiz.maxAttempts}) reached.` });
  }

  let attempt = await QuizAttempt.findOne({ quiz: req.params.id, student: req.dbUser.telegramId, status: 'in_progress' });
  if (!attempt) {
    const user = await User.findOne({ telegramId: req.dbUser.telegramId });
    attempt = await QuizAttempt.create({
      quiz: req.params.id,
      student: req.dbUser.telegramId,
      studentName: user?.fullName || user?.firstName || '',
      answers: new Array(quiz.questions.length).fill(null),
      total: quiz.questions.length,
      timeRemaining: quiz.timeLimit || 0,
    });
  }
  res.json(attempt);
});

router.patch('/:id/save', telegramAuth, requireApproved, async (req, res) => {
  const { answers, timeRemaining } = req.body;
  const attempt = await QuizAttempt.findOneAndUpdate(
    { quiz: req.params.id, student: req.dbUser.telegramId, status: 'in_progress' },
    { answers, timeRemaining }, { new: true }
  );
  if (!attempt) return res.status(404).json({ error: 'No active attempt' });
  res.json({ ok: true });
});

router.post('/:id/submit', telegramAuth, requireApproved, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const { answers } = req.body;
  let score = 0;
  const results = quiz.questions.map((q, i) => {
    const correct = answers[i] === q.answer;
    if (correct) score++;
    return { correct, correctAnswer: q.answer, explanation: q.explanation };
  });
  const percentage = Math.round((score / quiz.questions.length) * 100);
  await QuizAttempt.findOneAndUpdate(
    { quiz: req.params.id, student: req.dbUser.telegramId, status: 'in_progress' },
    { answers, score, percentage, status: 'submitted', submittedAt: new Date() }
  );
  res.json({ score, total: quiz.questions.length, percentage, results });
});

// Create quiz — fix: use upload.fields for per-question images
router.post('/', telegramAuth, requireAdmin, upload.any(), async (req, res) => {
  let { subject, title, questions, timeLimit, maxAttempts } = req.body;
  if (typeof questions === 'string') questions = JSON.parse(questions);

  // Attach uploaded images to questions
  if (req.files?.length) {
    req.files.forEach(f => {
      const match = f.fieldname.match(/image_(\d+)/);
      if (match) {
        const idx = parseInt(match[1]);
        if (questions[idx]) questions[idx].imageUrl = f.path;
      }
    });
  }

  const quiz = await Quiz.create({
    subject, title, questions,
    timeLimit: timeLimit ? parseInt(timeLimit) * 60 : 0,
    maxAttempts: maxAttempts ? parseInt(maxAttempts) : 0,
    addedBy: req.dbUser.telegramId,
  });
  res.status(201).json(quiz);
});

router.put('/:id', telegramAuth, requireAdmin, upload.any(), async (req, res) => {
  let { title, timeLimit, maxAttempts, questions } = req.body;
  const update = {};
  if (title)       update.title       = title;
  if (timeLimit)   update.timeLimit   = parseInt(timeLimit) * 60;
  if (maxAttempts !== undefined) update.maxAttempts = parseInt(maxAttempts);
  if (questions) {
    if (typeof questions === 'string') questions = JSON.parse(questions);
    if (req.files?.length) {
      req.files.forEach(f => {
        const match = f.fieldname.match(/image_(\d+)/);
        if (match && questions[parseInt(match[1])]) questions[parseInt(match[1])].imageUrl = f.path;
      });
    }
    update.questions = questions;
  }
  const quiz = await Quiz.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  res.json(quiz);
});

router.delete('/:id', telegramAuth, requireAdmin, async (req, res) => {
  await Quiz.findByIdAndDelete(req.params.id);
  await QuizAttempt.deleteMany({ quiz: req.params.id });
  res.json({ ok: true });
});

router.get('/:id/attempts', telegramAuth, requireAdmin, async (req, res) => {
  const attempts = await QuizAttempt.find({ quiz: req.params.id }).sort('-submittedAt');
  res.json(attempts);
});

export default router;
