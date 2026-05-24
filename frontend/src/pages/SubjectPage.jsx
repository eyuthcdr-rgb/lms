import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TABS = [
  { key: 'notes',    icon: '📝', label: 'Notes',    desc: 'Study materials & PDFs' },
  { key: 'videos',   icon: '🎬', label: 'Videos',   desc: 'Lecture videos' },
  { key: 'quiz',     icon: '❓', label: 'Quizzes',  desc: 'Test your knowledge' },
  { key: 'homework', icon: '📋', label: 'Homework', desc: 'Assignments & submissions' },
  { key: 'forum',    icon: '💬', label: 'Forum',    desc: 'Ask & discuss' },
];

export default function SubjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate('/')}>←</button>
        <h1>Subject</h1>
      </div>
      <div className="section-title">Choose a section</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TABS.map(t => (
          <button key={t.key} className="card card-hover"
            onClick={() => navigate(`/subject/${id}/${t.key}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{t.desc}</div>
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 20 }}>›</div>
          </button>
        ))}
      </div>
    </div>
  );
}
