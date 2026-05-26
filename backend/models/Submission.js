import mongoose from 'mongoose';
const answerSchema = new mongoose.Schema({
  questionIndex: Number,
  answer: mongoose.Schema.Types.Mixed, // index or string
  score:  { type: Number, default: null },
  feedback: { type: String, default: '' },
});
const submissionSchema = new mongoose.Schema({
  homework:      { type: mongoose.Schema.Types.ObjectId, ref: 'Homework' },
  quiz:          { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  student:       { type: Number, required: true },
  studentName:   { type: String, default: '' },
  // upload type
  fileUrl:       { type: String, default: '' },
  fileType:      { type: String, default: '' },
  note:          { type: String, default: '' },
  // interactive type
  answers:       [answerSchema],
  autoScore:     { type: Number, default: 0 },
  autoTotal:     { type: Number, default: 0 },
  manualScore:   { type: Number, default: null },
  totalScore:    { type: Number, default: null },
  // grading
  grade:         { type: String, default: '' },
  adminFeedback: { type: String, default: '' },
  needsManualGrading: { type: Boolean, default: false },
  status:        { type: String, enum: ['submitted','graded'], default: 'submitted' },
  submittedAt:   { type: Date, default: Date.now },
}, { timestamps: true });
export default mongoose.model('Submission', submissionSchema);
