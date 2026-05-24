import mongoose from 'mongoose';
const videoSchema = new mongoose.Schema({
  subject:     { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  url:         { type: String, default: '' },
  fileUrl:     { type: String, default: '' },
  thumbnail:   { type: String, default: '' },
  duration:    { type: String, default: '' },
  type:        { type: String, enum: ['youtube','upload','link'], default: 'youtube' },
  addedBy:     { type: Number },
}, { timestamps: true });
export default mongoose.model('Video', videoSchema);
