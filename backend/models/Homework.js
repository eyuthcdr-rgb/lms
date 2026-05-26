import mongoose from 'mongoose';
const hwQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type:     { type: String, enum: ['mcq','truefalse','short'], default: 'mcq' },
  options:  [String],
  answer:   { type: mongoose.Schema.Types.Mixed, default: null },
  maxScore: { type: Number, default: 1 },
});
const homeworkSchema = new mongoose.Schema({
  subject:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  homeworkType: { type: String, enum: ['upload','interactive'], default: 'upload' },
  questions:    [hwQuestionSchema],
  fileUrl:      { type: String, default: '' },
  fileType:     { type: String, default: '' },
  fileName:     { type: String, default: '' },
  dueDate:      { type: Date },
  addedBy:      { type: Number },
}, { timestamps: true });
export default mongoose.model('Homework', homeworkSchema);
