const BASE = import.meta.env.VITE_API_URL;
const getInitData = () => window.Telegram?.WebApp?.initData || '';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': getInitData(), ...(opts.headers || {}) },
  });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || 'Failed'); }
  return res.json();
}
async function up(path, fd, method = 'POST') {
  const res = await fetch(`${BASE}${path}`, { method, headers: { 'x-telegram-init-data': getInitData() }, body: fd });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || 'Failed'); }
  return res.json();
}

export const api = {
  // Auth/User
  getMe:            ()            => req('/api/users/me'),
  updateProfile:    (fd)          => up('/api/users/me', fd, 'PUT'),
  enrollRequest:    (sid)         => req(`/api/subjects/${sid}/enroll`, { method: 'POST' }),
  getMyEnrollments: ()            => req('/api/subjects/my-enrollments'),

  // Admin users
  getUsers:         (p, s)        => req(`/api/users?page=${p||1}&search=${encodeURIComponent(s||'')}`),
  getUser:          (tid)         => req(`/api/users/${tid}`),
  getUserFull:      (tid)         => req(`/api/users/${tid}/full`),
  approveUser:      (tid)         => req(`/api/users/${tid}/approve`,  { method: 'PATCH' }),
  blockUser:        (tid)         => req(`/api/users/${tid}/block`,    { method: 'PATCH' }),
  unblockUser:      (tid)         => req(`/api/users/${tid}/unblock`,  { method: 'PATCH' }),
  getFeedbacks:     ()            => req('/api/users/feedbacks'),
  sendFeedback:     (text, file)  => { const fd = new FormData(); fd.append('text', text); if (file) fd.append('file', file); return up('/api/users/feedback', fd); },

  // Subjects
  getSubjects:      ()            => req('/api/subjects'),
  createSubject:    (d)           => req('/api/subjects', { method: 'POST', body: JSON.stringify(d) }),
  updateSubject:    (id, d)       => req(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteSubject:    (id)          => req(`/api/subjects/${id}`, { method: 'DELETE' }),
  approveEnroll:    (sid, tid)    => req(`/api/subjects/${sid}/enroll/${tid}/approve`, { method: 'PATCH' }),
  getPendingEnrolls:(sid)         => req(`/api/subjects/${sid}/enrollments/pending`),

  // Notes
  getNotes:         (sid)         => req(`/api/notes?subject=${sid}`),
  createNote:       (fd)          => up('/api/notes', fd),
  updateNote:       (id, fd)      => up(`/api/notes/${id}`, fd, 'PUT'),
  deleteNote:       (id)          => req(`/api/notes/${id}`, { method: 'DELETE' }),
  markNoteRead:     (id)          => req(`/api/notes/${id}/read`, { method: 'POST' }),

  // Videos
  getVideos:        (sid)         => req(`/api/videos?subject=${sid}`),
  createVideo:      (fd)          => up('/api/videos', fd),
  updateVideo:      (id, fd)      => up(`/api/videos/${id}`, fd, 'PUT'),
  deleteVideo:      (id)          => req(`/api/videos/${id}`, { method: 'DELETE' }),
  markVideoWatched: (id)          => req(`/api/videos/${id}/watched`, { method: 'POST' }),

  // Quizzes
  getQuizzes:       (sid)         => req(`/api/quizzes?subject=${sid}`),
  getQuiz:          (id)          => req(`/api/quizzes/${id}`),
  startQuiz:        (id)          => req(`/api/quizzes/${id}/start`, { method: 'POST' }),
  saveQuiz:         (id, a, t)    => req(`/api/quizzes/${id}/save`, { method: 'PATCH', body: JSON.stringify({ answers: a, timeRemaining: t }) }),
  submitQuiz:       (id, a)       => req(`/api/quizzes/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers: a }) }),
  createQuiz:       (fd)          => up('/api/quizzes', fd),
  updateQuiz:       (id, fd)      => up(`/api/quizzes/${id}`, fd, 'PUT'),
  deleteQuiz:       (id)          => req(`/api/quizzes/${id}`, { method: 'DELETE' }),
  getMyAttempts:    (id)          => req(`/api/quizzes/${id}/my-attempts`),
  getAllAttempts:    (id)          => req(`/api/quizzes/${id}/attempts`),

  // Homework
  getHomework:      (sid)         => req(`/api/homework?subject=${sid}`),
  getHomeworkItem:  (id)          => req(`/api/homework/${id}`),
  createHomework:   (fd)          => up('/api/homework', fd),
  updateHomework:   (id, fd)      => up(`/api/homework/${id}`, fd, 'PUT'),
  deleteHomework:   (id)          => req(`/api/homework/${id}`, { method: 'DELETE' }),
  submitHomework:   (id, fd)      => up(`/api/homework/${id}/submit`, fd),
  getSubmissions:   (id)          => req(`/api/homework/${id}/submissions`),
  gradeSubmission:  (sid, d)      => req(`/api/homework/submissions/${sid}/grade`, { method: 'PATCH', body: JSON.stringify(d) }),

  // Forum
  getQuestions:     (sid)         => req(`/api/questions?subject=${sid}`),
  askQuestion:      (fd)          => up('/api/questions', fd),
  answerQuestion:   (id, text)    => req(`/api/questions/${id}/answer`, { method: 'POST', body: JSON.stringify({ text }) }),
  pinQuestion:      (id)          => req(`/api/questions/${id}/pin`, { method: 'PATCH' }),
  resolveQuestion:  (id)          => req(`/api/questions/${id}/resolve`, { method: 'PATCH' }),
  pinAnswer:        (qid, aid)    => req(`/api/questions/${qid}/answers/${aid}/pin`, { method: 'PATCH' }),
  deleteQuestion:   (id)          => req(`/api/questions/${id}`, { method: 'DELETE' }),

  // Analytics
  getMyStats:       ()            => req('/api/analytics/me'),
  getAdminStats:    ()            => req('/api/analytics/admin'),
  getStatDetail:    (type)        => req(`/api/analytics/detail/${type}`),
  getReminders:     ()            => req('/api/analytics/reminders'),
};
