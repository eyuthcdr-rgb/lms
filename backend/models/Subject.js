import mongoose from 'mongoose';
const subjectSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  description:      { type: String, default: '' },
  icon:             { type: String, default: '📚' },
  color:            { type: String, default: '#4C6FFF' },
  coverUrl:         { type: String, default: '' },
  order:            { type: Number, default: 0 },
  requiresApproval: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Subject', subjectSchema);
