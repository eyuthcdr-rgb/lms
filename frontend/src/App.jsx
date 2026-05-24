import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTelegram }    from './hooks/useTelegram.js';
import { api }            from './api.js';
import BottomNav          from './components/BottomNav.jsx';
import Home               from './pages/Home.jsx';
import SubjectPage        from './pages/SubjectPage.jsx';
import NotesPage          from './pages/NotesPage.jsx';
import VideosPage         from './pages/VideosPage.jsx';
import QuizPage           from './pages/QuizPage.jsx';
import HomeworkPage       from './pages/HomeworkPage.jsx';
import ForumPage          from './pages/ForumPage.jsx';
import ProfilePage        from './pages/ProfilePage.jsx';
import DashboardPage      from './pages/DashboardPage.jsx';
import AdminPage          from './pages/AdminPage.jsx';

export default function App() {
  useTelegram();
  const [user, setUser]     = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api.getMe()
      .then(u => { setUser(u); setStatus(u.status); })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize: 48 }}>📚</div>
      <div className="spinner" style={{ margin: 0 }} />
      <p style={{ color:'var(--text2)', fontSize:14 }}>Loading your platform…</p>
    </div>
  );

  if (status === 'pending') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', flexDirection:'column', gap:12, padding: 32 }}>
      <div style={{ fontSize: 64 }}>⏳</div>
      <h2 style={{ fontWeight: 800 }}>Pending Approval</h2>
      <p style={{ color:'var(--text2)', textAlign:'center', fontSize: 14 }}>
        Your registration is under review.<br/>You'll receive a message once approved.
      </p>
    </div>
  );

  if (status === 'blocked') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', flexDirection:'column', gap:12, padding: 32 }}>
      <div style={{ fontSize: 64 }}>🚫</div>
      <h2 style={{ fontWeight: 800 }}>Access Blocked</h2>
      <p style={{ color:'var(--text2)', textAlign:'center', fontSize: 14 }}>Contact your admin for help.</p>
    </div>
  );

  if (status === 'error') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', flexDirection:'column', gap:12, padding: 32 }}>
      <div style={{ fontSize: 64 }}>⚠️</div>
      <h2 style={{ fontWeight: 800 }}>Connection Error</h2>
      <p style={{ color:'var(--text2)', textAlign:'center', fontSize: 14 }}>Could not reach the server. Please try again.</p>
    </div>
  );

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <div style={{ paddingBottom: 'var(--nav-h)' }}>
        <Routes>
          <Route path="/"                       element={<Home user={user} />} />
          <Route path="/profile"                element={<ProfilePage user={user} />} />
          <Route path="/dashboard"              element={<DashboardPage isAdmin={isAdmin} />} />
          <Route path="/subject/:id"            element={<SubjectPage />} />
          <Route path="/subject/:id/notes"      element={<NotesPage    isAdmin={isAdmin} />} />
          <Route path="/subject/:id/videos"     element={<VideosPage   isAdmin={isAdmin} />} />
          <Route path="/subject/:id/quiz"       element={<QuizPage     isAdmin={isAdmin} />} />
          <Route path="/subject/:id/homework"   element={<HomeworkPage isAdmin={isAdmin} />} />
          <Route path="/subject/:id/forum"      element={<ForumPage    isAdmin={isAdmin} />} />
          {isAdmin && <Route path="/admin"      element={<AdminPage />} />}
          <Route path="*"                       element={<Navigate to="/" />} />
        </Routes>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
