import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';
import ReminderBanner from '../components/ReminderBanner.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import { pct } from '../utils/helpers.js';

export default function Home({ user }) {
  const [subjects, setSubjects]     = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    Promise.all([
      api.getSubjects(),
      isAdmin ? Promise.resolve([]) : api.getMyEnrollments(),
      api.getMyStats().catch(() => null),
    ]).then(([subs, enr, st]) => {
      setSubjects(subs);
      setEnrollments(enr);
      setStats(st);
    }).finally(() => setLoading(false));
  }, []);

  const getEnrollStatus = (sid) => {
    const e = enrollments.find(e => e.subject === sid || e.subject?._id === sid);
    return e?.status || null;
  };

  const handleEnroll = async (e, sid) => {
    e.stopPropagation();
    await api.requestEnroll(sid);
    const enr = await api.getMyEnrollments();
    setEnrollments(enr);
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: 8 }}>
        <Avatar src={user?.profilePicUrl} name={user?.fullName || user?.firstName} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            Hey, {user?.fullName?.split(' ')[0] || user?.firstName} 👋
          </div>
        </div>
      </div>

      {/* Reminders (students only) */}
      {!isAdmin && <ReminderBanner />}

      {/* Quick stats */}
      {stats && !isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { icon: '📚', val: stats.totalSubjects || 0, label: 'Subjects' },
            { icon: '✅', val: stats.completedQuizzes || 0, label: 'Quizzes' },
            { icon: '🏆', val: `${stats.averageScore || 0}%`, label: 'Avg Score' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Subjects */}
      <div className="section-title">📚 Subjects</div>
      {loading && <div className="spinner" />}
      {!loading && subjects.length === 0 && (
        <div className="empty"><div className="empty-icon">📭</div><h3>No subjects yet</h3><p style={{ color: 'var(--text2)', fontSize: 14 }}>Ask your admin to add subjects</p></div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {subjects.map(s => {
          const status = isAdmin ? 'approved' : getEnrollStatus(s._id);
          return (
            <div key={s._id} className="card card-hover"
              onClick={() => status === 'approved' ? navigate(`/subject/${s._id}`) : null}
              style={{ cursor: status === 'approved' ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: s.color || 'var(--grad1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>
                  {s.icon || '📚'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{s.name}</div>
                  {s.description && <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {!isAdmin && status === 'approved' && <span className="badge badge-green">✅ Enrolled</span>}
                    {!isAdmin && status === 'pending'  && <span className="badge badge-yellow">⏳ Pending</span>}
                    {!isAdmin && !status               && <span className="badge badge-purple">Not enrolled</span>}
                  </div>
                </div>
                {status === 'approved'
                  ? <div style={{ color: 'var(--text3)', fontSize: 20 }}>›</div>
                  : !isAdmin && !status
                    ? <button className="btn btn-primary btn-sm" onClick={e => handleEnroll(e, s._id)}>Enroll</button>
                    : !isAdmin && status === 'pending'
                      ? <span style={{ fontSize: 12, color: 'var(--text3)' }}>Waiting…</span>
                      : <div style={{ color: 'var(--text3)', fontSize: 20 }}>›</div>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
