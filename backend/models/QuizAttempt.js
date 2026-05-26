import mongoose from 'mongoose';
const answerSchema = new mongoose.Schema({
  questionIndex: Number,
  answer: mongoose.Schema.Types.Mixed,
  score: { type: Number, default: null },
  feedback: { type: String, default: '' },
});
const quizAttemptSchema = new mongoose.Schema({
  quiz:          { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student:       { type: Number, required: true },
  studentName:   { type: String, default: '' },
  answers:       [answerSchema],
  rawAnswers:    [mongoose.Schema.Types.Mixed], // simple array indexed by question
  score:         { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  percentage:    { type: Number, default: 0 },
  timeRemaining: { type: Number, default: 0 },
  needsManualGrading: { type: Boolean, default: false },
  status:        { type: String, enum: ['in_progress','submitted','timed_out'], default: 'in_progress' },
  startedAt:     { type: Date, default: Date.now },
  submittedAt:   { type: Date },
}, { timestamps: true });
export default mongoose.model('QuizAttempt', quizAttemptSchema);
