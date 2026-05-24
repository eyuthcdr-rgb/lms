import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';
import { formatDate, pct } from '../utils/helpers.js';

function StatCard({ icon, label, value, color, sub, onClick }) {
  return (
    <div onClick={onClick} className="card" style={{
      textAlign: 'center', padding: '18px 10px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform .15s',
      borderTop: `3px solid ${color || 'var(--primary)'}`,
    }}
      onMouseDown={e => onClick && (e.currentTarget.style.transform = 'scale(.97)')}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--primary)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      {onClick && <div style={{ fontSize: 10, color: 'var(--primary)', marginTop: 6 }}>Tap to view →</div>}
    </div>
  );
}

function DrillDown({ title, children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        maxHeight: '80vh', overflow: 'auto', padding: '20px 16px 32px',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage({ isAdmin }) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill]     = useState(null); // { title, content }
  const navigate = useNavigate();

  useEffect(() => {
    (isAdmin ? api.getAdminStats() : api.getMyStats())
      .then(setStats).finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!stats)  return <div className="empty"><div className="empty-icon">⚠️</div><h3>Could not load stats</h3></div>;

  const openDrill = (title, content) => setDrill({ title, content });

  // ── Admin dashboard ──────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="page">
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 20 }}>📊 Admin Dashboard</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <StatCard icon="👥" label="Total Students" value={stats.totalStudents} color="var(--primary)"
            onClick={() => openDrill('All Students', <StudentList students={stats.activeUsers} />)} />
          <StatCard icon="🟢" label="Active Today" value={stats.activeToday} color="var(--success)"
            onClick={() => openDrill('Active Today', <StudentList students={stats.activeUsers} />)} />
          <StatCard icon="⏳" label="Pending Approval" value={stats.pendingApproval} color="var(--warning)"
            onClick={() => openDrill('Pending Approval', <PendingList items={stats.pendingList} onAction={() => (isAdmin ? api.getAdminStats() : null).then(setStats)} />)} />
          <StatCard icon="📝" label="To Grade" value={stats.pendingSubmissions} color="var(--danger)"
            onClick={() => openDrill('Ungraded Submissions', <SubmissionList items={stats.pendingSubmissionsList} />)} />
          <StatCard icon="🏆" label="Avg Quiz Score" value={`${stats.averageQuizScore}%`} color="var(--primary2)"
            onClick={() => openDrill('Quiz Leaderboard', <Leaderboard items={stats.leaderboard} />)} />
          <StatCard icon="❓" label="Quizzes Taken" value={stats.totalQuizzesTaken} color="var(--info)"
            onClick={() => openDrill('All Quiz Attempts', <AttemptList items={stats.allAttempts} />)} />
        </div>

        {/* Leaderboard preview */}
        {stats.leaderboard?.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🏆 Top Students</div>
            {stats.leaderboard.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: i < 3 ? '#fff' : 'var(--text2)' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>{s.avg}%</div>
              </div>
            ))}
          </div>
        )}

        {drill && <DrillDown title={drill.title} onClose={() => setDrill(null)}>{drill.content}</DrillDown>}
      </div>
    );
  }

  // ── Student dashboard ────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 20 }}>📊 My Progress</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard icon="❓" label="Quizzes Taken" value={stats.quizzesTaken} color="var(--primary)"
          onClick={() => openDrill('My Quiz History', <MyAttempts items={stats.attempts} />)} />
        <StatCard icon="🏆" label="Avg Score" value={`${stats.averageScore}%`}
          color={stats.averageScore >= 70 ? 'var(--success)' : 'var(--warning)'}
          onClick={() => openDrill('Score Breakdown', <MyAttempts items={stats.attempts} />)} />
        <StatCard icon="📋" label="Pending HW" value={stats.pendingHomework} color="var(--danger)"
          onClick={() => openDrill('Pending Homework', <HWList items={stats.pendingList} />)} />
        <StatCard icon="✅" label="Graded Work" value={stats.gradedWork} color="var(--success)"
          onClick={() => openDrill('Graded Submissions', <MySubmissions items={stats.submissions?.filter(s => s.status === 'graded')} />)} />
        <StatCard icon="📝" label="Notes Read" value={stats.completedLessons} color="var(--info)" />
        <StatCard icon="🎬" label="Videos Watched" value={stats.completedVideos} color="var(--primary2)" />
      </div>

      {/* Recent quiz activity */}
      {stats.recentAttempts?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📈 Recent Quizzes</div>
          {stats.recentAttempts.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.recentAttempts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.quiz?.title || 'Quiz'}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(a.submittedAt)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: a.percentage >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                {a.percentage}%
              </div>
            </div>
          ))}
        </div>
      )}

      {drill && <DrillDown title={drill.title} onClose={() => setDrill(null)}>{drill.content}</DrillDown>}
    </div>
  );
}

// ── Drill-down sub-components ──────────────────────────────────────────────
function StudentList({ students }) {
  if (!students?.length) return <div className="empty"><p>No students found</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {students.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar src={s.profilePicUrl} name={s.fullName || s.firstName} size={38} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.fullName || s.firstName}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>@{s.username || 'none'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingList({ items }) {
  if (!items?.length) return <div className="empty"><p>No pending approvals</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((u, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <Avatar src={u.profilePicUrl} name={u.fullName || u.firstName} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.fullName || u.firstName}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>ID: {u.telegramId}</div>
          </div>
          <span className="badge badge-yellow">Pending</span>
        </div>
      ))}
    </div>
  );
}

function SubmissionList({ items }) {
  if (!items?.length) return <div className="empty"><p>No pending submissions</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((s, i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.studentName}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{s.homework?.title || 'Homework'}</div>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ items }) {
  if (!items?.length) return <div className="empty"><p>No data yet</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{s.attempts} attempts</div>
          </div>
          <div style={{ fontWeight: 700, color: 'var(--success)' }}>{s.avg}%</div>
        </div>
      ))}
    </div>
  );
}

function AttemptList({ items }) {
  if (!items?.length) return <div className="empty"><p>No attempts yet</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.slice(0, 30).map((a, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.studentName}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{a.quiz?.title || 'Quiz'} · {formatDate(a.submittedAt)}</div>
          </div>
          <div style={{ fontWeight: 700, color: a.percentage >= 70 ? 'var(--success)' : 'var(--warning)' }}>{a.percentage}%</div>
        </div>
      ))}
    </div>
  );
}

function MyAttempts({ items }) {
  if (!items?.length) return <div className="empty"><p>No quizzes taken yet</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((a, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.quiz?.title || 'Quiz'}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{a.score}/{a.total} correct · {formatDate(a.submittedAt)}</div>
          </div>
          <div style={{ fontWeight: 700, color: a.percentage >= 70 ? 'var(--success)' : 'var(--warning)', fontSize: 16 }}>{a.percentage}%</div>
        </div>
      ))}
    </div>
  );
}

function HWList({ items }) {
  if (!items?.length) return <div className="empty"><p>All caught up! 🎉</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((hw, i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{hw.title}</div>
          {hw.dueDate && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>Due: {formatDate(hw.dueDate)}</div>}
        </div>
      ))}
    </div>
  );
}

function MySubmissions({ items }) {
  if (!items?.length) return <div className="empty"><p>No graded work yet</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((s, i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.homework?.title || 'Homework'}</div>
            <span className="badge badge-green">{s.grade}</span>
          </div>
          {s.adminFeedback && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s.adminFeedback}</div>}
        </div>
      ))}
    </div>
  );
}
