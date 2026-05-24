import mongoose from 'mongoose';
const quizAttemptSchema = new mongoose.Schema({
  quiz:          { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student:       { type: Number, required: true },
  studentName:   { type: String, default: '' },
  answers:       [{ type: Number, default: null }],
  score:         { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  percentage:    { type: Number, default: 0 },
  timeRemaining: { type: Number, default: 0 },
  status:        { type: String, enum: ['in_progress','submitted','timed_out'], default: 'in_progress' },
  startedAt:     { type: Date, default: Date.now },
  submittedAt:   { type: Date },
}, { timestamps: true });
export default mongoose.model('QuizAttempt', quizAttemptSchema);
