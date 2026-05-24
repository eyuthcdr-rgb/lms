import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId:       { type: Number, required: true, unique: true },
  username:         { type: String, default: '' },
  firstName:        { type: String, default: '' },
  lastName:         { type: String, default: '' },
  fullName:         { type: String, default: '' },
  profilePicUrl:    { type: String, default: '' },
  academicLevel:    { type: String, default: '' },
  bio:              { type: String, default: '' },
  role:             { type: String, enum: ['student','admin'], default: 'student' },
  status:           { type: String, enum: ['pending','approved','blocked'], default: 'pending' },
  regStep:          { type: String, enum: ['awaiting_name','awaiting_level','awaiting_photo','done'], default: 'awaiting_name' },
  lastSeen:         { type: Date, default: Date.now },
  enrolledCourses:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  pendingCourses:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
  completedVideos:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  feedbackHistory:  [{
    text: String, fileUrl: String, fileType: String,
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

export default mongoose.model('User', userSchema);
