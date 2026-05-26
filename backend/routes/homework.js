import { Router } from 'express';
import Homework from '../models/Homework.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

const autoGradeHW = (questions, rawAnswers) => {
  let score = 0, total = 0, needsManual = false;
  questions.forEach((q, i) => {
    if (q.type === 'short') { total += q.maxScore||1; needsManual = true; }
    else { total += 1; if (rawAnswers[i] === q.answer) score++; }
  });
  return { autoScore: score, autoTotal: total, needsManualGrading: needsManual };
};

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const filter = req.query.subject ? { subject: req.query.subject } : {};
  const homework = await Homework.find(filter).sort('-createdAt').populate('subject','name');
  res.json(homework);
});

router.get('/submissions/pending', telegramAuth, requireAdmin, async (req, res) => {
  const subs = await Submission.find({ homework: { $exists: true }, needsManualGrading: true, status: 'submitted' })
    .populate('homework','title').sort('-submittedAt');
  res.json(subs);
});

router.get('/:id', telegramAuth, requireApproved, async (req, res) => {
  const hw = await Homework.findById(req.params.id).populate('subject','name icon');
  if (!hw) return res.status(404).json({ error: 'Not found' });
  const mySubmission = await Submission.findOne({ homework: req.params.id, student: req.dbUser.telegramId });
  res.json({ homework: hw, mySubmission: mySubmission||null });
});

router.get('/:id/submissions', telegramAuth, requireAdmin, async (req, res) => {
  const subs = await Submission.find({ homework: req.params.id }).sort('-submittedAt');
  res.json(subs);
});

router.post('/', telegramAuth, requireAdmin, upload.single('file'), async (req, res) => {
  let { subject, title, description, dueDate, homeworkType, questions } = req.body;
  if (typeof questions === 'string') questions = JSON.parse(questions);
  const hw = await Homework.create({
    subject, title, description,
    homeworkType: homeworkType || 'upload',
    questions: questions || [],
    dueDate: dueDate ? new Date(dueDate) : null,
    fileUrl: req.file?.path || '',
    fileName: req.file?.originalname || '',
    fileType: req.file ? (req.file.mimetype.includes('pdf') ? 'pdf' : 'image') : '',
    addedBy: req.dbUser.telegramId,
  });
  res.status(201).json(hw);
});

router.put('/:id', telegramAuth, requireAdmin, upload.single('file'), async (req, res) => {
  let { questions, ...rest } = req.body;
  if (typeof questions === 'string') questions = JSON.parse(questions);
  const update = { ...rest };
  if (questions) update.questions = questions;
  if (req.file) { update.fileUrl = req.file.path; update.fileName = req.file.originalname; update.fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image'; }
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
  const hw = await Homework.findById(req.params.id);
  const user = await User.findOne({ telegramId: req.dbUser.telegramId });
  let subData = { homework: req.params.id, student: req.dbUser.telegramId, studentName: user?.fullName||user?.firstName||'' };

  if (hw.homeworkType === 'interactive') {
    const rawAnswers = JSON.parse(req.body.answers || '[]');
    const { autoScore, autoTotal, needsManualGrading } = autoGradeHW(hw.questions, rawAnswers);
    subData = { ...subData, answers: rawAnswers.map((a,i) => ({ questionIndex:i, answer:a })), autoScore, autoTotal, needsManualGrading };
  } else {
    subData = { ...subData, fileUrl: req.file?.path||'', fileType: req.file?(req.file.mimetype.includes('pdf')?'pdf':'image'):'', note: req.body.note||'', needsManualGrading: true };
  }
  const sub = await Submission.create(subData);
  res.status(201).json(sub);
});

router.patch('/submissions/:subId/grade', telegramAuth, requireAdmin, async (req, res) => {
  const { grade, adminFeedback, manualScore, questionIndex, questionScore } = req.body;
  const sub = await Submission.findById(req.params.subId);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (grade !== undefined) sub.grade = grade;
  if (adminFeedback !== undefined) sub.adminFeedback = adminFeedback;
  if (manualScore !== undefined) { sub.manualScore = +manualScore; sub.needsManualGrading = false; sub.status = 'graded'; }
  if (questionIndex !== undefined && questionScore !== undefined) {
    const ans = sub.answers?.find(a => a.questionIndex === +questionIndex);
    if (ans) ans.score = +questionScore;
  }
  await sub.save();
  res.json(sub);
});

export default router;
