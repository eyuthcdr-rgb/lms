import mongoose from 'mongoose';
const submissionSchema = new mongoose.Schema({
  homework:      { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true },
  student:       { type: Number, required: true },
  studentName:   { type: String, default: '' },
  fileUrl:       { type: String, default: '' },
  fileType:      { type: String, default: '' },
  note:          { type: String, default: '' },
  grade:         { type: String, default: '' },
  adminFeedback: { type: String, default: '' },
  status:        { type: String, enum: ['submitted','graded'], default: 'submitted' },
  submittedAt:   { type: Date, default: Date.now },
}, { timestamps: true });
export default mongoose.model('Submission', submissionSchema);
