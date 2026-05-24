import mongoose from 'mongoose';
const noteSchema = new mongoose.Schema({
  subject:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title:    { type: String, required: true },
  content:  { type: String, default: '' },
  fileUrl:  { type: String, default: '' },
  fileType: { type: String, default: '' },
  fileName: { type: String, default: '' },
  chapter:  { type: String, default: '' },
  pinned:   { type: Boolean, default: false },
  addedBy:  { type: Number },
}, { timestamps: true });
export default mongoose.model('Note', noteSchema);
