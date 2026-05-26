import mongoose from 'mongoose';
const questionSchema = new mongoose.Schema({
  question:    { type: String, required: true },
  type:        { type: String, enum: ['mcq','truefalse','short'], default: 'mcq' },
  imageUrl:    { type: String, default: '' },
  options:     [String],
  answer:      { type: mongoose.Schema.Types.Mixed, default: null }, // index for mcq/tf, null for short
  explanation: { type: String, default: '' },
  maxScore:    { type: Number, default: 1 }, // for short answer grading
});
const quizSchema = new mongoose.Schema({
  subject:     { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title:       { type: String, required: true },
  questions:   [questionSchema],
  timeLimit:   { type: Number, default: 0 }, // seconds
  maxAttempts: { type: Number, default: 0 },
  addedBy:     { type: Number },
}, { timestamps: true });
export default mongoose.model('Quiz', quizSchema);
