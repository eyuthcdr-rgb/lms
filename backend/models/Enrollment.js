import mongoose from 'mongoose';
const enrollmentSchema = new mongoose.Schema({
  student:     { type: Number, required: true },
  studentName: { type: String, default: '' },
  subject:     { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  resolvedAt:  { type: Date },
}, { timestamps: true });
export default mongoose.model('Enrollment', enrollmentSchema);
