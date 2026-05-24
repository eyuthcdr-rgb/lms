import mongoose from 'mongoose';
const homeworkSchema = new mongoose.Schema({
  subject:     { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  fileUrl:     { type: String, default: '' },
  fileType:    { type: String, default: '' },
  fileName:    { type: String, default: '' },
  dueDate:     { type: Date },
  addedBy:     { type: Number },
}, { timestamps: true });
export default mongoose.model('Homework', homeworkSchema);
