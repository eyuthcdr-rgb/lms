import { Router } from 'express';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

const autoGrade = (questions, rawAnswers) => {
  let score = 0, total = 0;
  const needsManual = questions.some(q => q.type === 'short');
  const results = questions.map((q, i) => {
    if (q.type === 'short') {
      total += q.maxScore || 1;
      return { type:'short', answer: rawAnswers[i], correct: null, correctAnswer: null };
    }
    total += 1;
    const correct = rawAnswers[i] === q.answer;
    if (correct) score++;
    return { type: q.type, answer: rawAnswers[i], correct, correctAnswer: q.answer, explanation: q.explanation };
  });
  return { score, total, results, needsManual };
};

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const filter = req.query.subject ? { subject: req.query.subject } : {};
  const quizzes = await Quiz.find(filter).sort('-createdAt').populate('subject','name')
    .select('-questions.answer -questions.explanation');
  const tid = req.dbUser.telegramId;
  const out = await Promise.all(quizzes.map(async q => {
    const myAttempts = await QuizAttempt.countDocuments({ quiz: q._id, student: tid, status:{$in:['submitted','timed_out']} });
    return { ...q.toObject(), myAttempts };
  }));
  res.json(out);
});

router.get('/:id/my-attempts', telegramAuth, requireApproved, async (req, res) => {
  const attempts = await QuizAttempt.find({ quiz: req.params.id, student: req.dbUser.telegramId }).sort('-createdAt');
  res.json(attempts);
});

router.get('/:id/attempts', telegramAuth, requireAdmin, async (req, res) => {
  const attempts = await QuizAttempt.find({ quiz: req.params.id }).sort('-submittedAt');
  res.json(attempts);
});

router.get('/:id', telegramAuth, requireApproved, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('subject','name icon').select('-questions.answer');
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const attempt = await QuizAttempt.findOne({ quiz: req.params.id, student: req.dbUser.telegramId, status:'in_progress' });
  const doneAttempts = await QuizAttempt.countDocuments({ quiz: req.params.id, student: req.dbUser.telegramId, status:{$in:['submitted','timed_out']} });
  res.json({ quiz, attempt: attempt||null, doneAttempts });
});

router.post('/:id/start', telegramAuth, requireApproved, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const done = await QuizAttempt.countDocuments({ quiz: req.params.id, student: req.dbUser.telegramId, status:{$in:['submitted','timed_out']} });
  if (quiz.maxAttempts > 0 && done >= quiz.maxAttempts) return res.status(403).json({ error: `Max attempts (${quiz.maxAttempts}) reached.` });
  let attempt = await QuizAttempt.findOne({ quiz: req.params.id, student: req.dbUser.telegramId, status:'in_progress' });
  if (!attempt) {
    const user = await User.findOne({ telegramId: req.dbUser.telegramId });
    attempt = await QuizAttempt.create({
      quiz: req.params.id, student: req.dbUser.telegramId,
      studentName: user?.fullName || user?.firstName || '',
      rawAnswers: new Array(quiz.questions.length).fill(null),
      total: quiz.questions.length,
      timeRemaining: quiz.timeLimit || 0,
    });
  }
  res.json(attempt);
});

router.patch('/:id/save', telegramAuth, requireApproved, async (req, res) => {
  const { rawAnswers, timeRemaining } = req.body;
  const attempt = await QuizAttempt.findOneAndUpdate(
    { quiz: req.params.id, student: req.dbUser.telegramId, status:'in_progress' },
    { rawAnswers, timeRemaining }, { new: true }
  );
  if (!attempt) return res.status(404).json({ error: 'No active attempt' });
  res.json({ ok: true });
});

router.post('/:id/submit', telegramAuth, requireApproved, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const { rawAnswers } = req.body;
  const { score, total, results, needsManual } = autoGrade(quiz.questions, rawAnswers);
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  await QuizAttempt.findOneAndUpdate(
    { quiz: req.params.id, student: req.dbUser.telegramId, status:'in_progress' },
    { rawAnswers, score, total, percentage, needsManualGrading: needsManual, status:'submitted', submittedAt: new Date() }
  );
  res.json({ score, total, percentage, results, needsManual });
});

// Grade a short answer in an attempt (admin)
router.patch('/:id/attempts/:attemptId/grade', telegramAuth, requireAdmin, async (req, res) => {
  const { questionIndex, score, feedback } = req.body;
  const attempt = await QuizAttempt.findById(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Not found' });
  if (!attempt.answers) attempt.answers = [];
  const existing = attempt.answers.find(a => a.questionIndex === questionIndex);
  if (existing) { existing.score = score; existing.feedback = feedback; }
  else attempt.answers.push({ questionIndex, answer: attempt.rawAnswers?.[questionIndex], score, feedback });
  const quiz = await Quiz.findById(req.params.id);
  const allShortGraded = quiz.questions.every((q, i) => q.type !== 'short' || attempt.answers.find(a => a.questionIndex === i && a.score !== null));
  if (allShortGraded) attempt.needsManualGrading = false;
  await attempt.save();
  res.json(attempt);
});

router.post('/', telegramAuth, requireAdmin, upload.any(), async (req, res) => {
  let { subject, title, questions, timeLimit, maxAttempts } = req.body;
  if (typeof questions === 'string') questions = JSON.parse(questions);
  if (req.files?.length) req.files.forEach(f => { const m = f.fieldname.match(/image_(\d+)/); if (m && questions[+m[1]]) questions[+m[1]].imageUrl = f.path; });
  // timeLimit comes in as minutes from frontend, convert to seconds
  const timeLimitSec = timeLimit ? parseInt(timeLimit) * 60 : 0;
  const quiz = await Quiz.create({ subject, title, questions, timeLimit: timeLimitSec, maxAttempts: maxAttempts ? +maxAttempts : 0, addedBy: req.dbUser.telegramId });
  res.status(201).json(quiz);
});

router.put('/:id', telegramAuth, requireAdmin, upload.any(), async (req, res) => {
  let { title, timeLimit, maxAttempts, questions } = req.body;
  const update = {};
  if (title) update.title = title;
  if (timeLimit !== undefined) update.timeLimit = parseInt(timeLimit) * 60;
  if (maxAttempts !== undefined) update.maxAttempts = +maxAttempts;
  if (questions) {
    if (typeof questions === 'string') questions = JSON.parse(questions);
    if (req.files?.length) req.files.forEach(f => { const m = f.fieldname.match(/image_(\d+)/); if (m && questions[+m[1]]) questions[+m[1]].imageUrl = f.path; });
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

export default router;
