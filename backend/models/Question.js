import mongoose from 'mongoose';
const answerSchema = new mongoose.Schema({
  answeredBy: Number, answererName: String,
  text: String, isAdmin: Boolean, isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const questionSchema = new mongoose.Schema({
  subject:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  askedBy:    { type: Number, required: true },
  askerName:  { type: String, default: '' },
  text:       { type: String, required: true },
  imageUrl:   { type: String, default: '' },
  answers:    [answerSchema],
  isResolved: { type: Boolean, default: false },
  isPinned:   { type: Boolean, default: false },
}, { timestamps: true });
export default mongoose.model('Question', questionSchema);
