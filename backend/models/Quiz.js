import mongoose from 'mongoose';
const questionSchema = new mongoose.Schema({
  question:    { type: String, required: true },
  imageUrl:    { type: String, default: '' },
  options:     [String],
  answer:      { type: Number, required: true },
  explanation: { type: String, default: '' },
});
const quizSchema = new mongoose.Schema({
  subject:     { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title:       { type: String, required: true },
  questions:   [questionSchema],
  timeLimit:   { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 0 },
  addedBy:     { type: Number },
}, { timestamps: true });
export default mongoose.model('Quiz', quizSchema);
