import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';

export default function Home({ user }) {
  const [subjects, setSubjects]       = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats]             = useState(null);
  const [reminders, setReminders]     = useState([]);
  const [dismissed, setDismissed]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_reminders') || '[]'); } catch { return []; }
  });
  const [enrolling, setEnrolling]     = useState({});
  const [loading, setLoading]         = useState(true);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const calls = [
      api.getSubjects(),
      isAdmin ? Promise.resolve([]) : api.getMyEnrollments(),
      api.getMyStats().catch(() => null),
      isAdmin ? Promise.resolve([]) : api.getReminders().catch(() => []),
    ];
    Promise.all(calls).then(([subs, enr, st, rem]) => {
      setSubjects(subs || []);
      setEnrollments(enr || []);
      setStats(st);
      setReminders((rem || []).filter(r => !dismissed.includes(r.title)));
    }).finally(() => setLoading(false));
  }, []);

  const getEnrollStatus = (sid) => {
    const e = enrollments.find(e => String(e.subject?._id || e.subject) === String(sid));
    return e?.status || null;
  };

  const handleEnroll = async (e, sid) => {
    e.stopPropagation();
    if (enrolling[sid]) return;
    setEnrolling(prev => ({ ...prev, [sid]: true }));
    try {
      await api.requestEnroll(sid);
      const enr = await api.getMyEnrollments();
      setEnrollments(enr);
    } catch(err) {
      // ignore "already pending" errors silently
      const enr = await api.getMyEnrollments();
      setEnrollments(enr);
    } finally {
      setEnrolling(prev => ({ ...prev, [sid]: false }));
    }
  };

  const dismissReminder = (title) => {
    const next = [...dismissed, title];
    setDismissed(next);
    try { localStorage.setItem('dismissed_reminders', JSON.stringify(next)); } catch {}
    setReminders(r => r.filter(x => x.title !== title));
  };

  const enrolledCount = enrollments.filter(e => e.status === 'approved').length;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, paddingTop:8 }}>
        <Avatar src={user?.profilePicUrl} name={user?.fullName || user?.firstName} size={44} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:'var(--text2)' }}>
            {new Date().toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric' })}
          </div>
          <div style={{ fontSize:18, fontWeight:700 }}>
            Hey, {user?.fullName?.split(' ')[0] || user?.firstName} 👋
          </div>
        </div>
      </div>

      {/* Reminders */}
      {!isAdmin && reminders.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {reminders.map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, marginBottom:8,
              background: r.urgent ? '#FEE2E2' : r.type === 'new_note' || r.type === 'new_video' ? '#EEF2FF' : '#FEF3C7',
              border:`1px solid ${r.urgent?'#FECACA':r.type==='new_note'||r.type==='new_video'?'#C7D2FE':'#FDE68A'}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{r.title}</div>
                {r.message && <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{r.message}</div>}
              </div>
              <button onClick={() => dismissReminder(r.title)}
                style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18, padding:4 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats - students only */}
      {!isAdmin && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
          {[
            { icon:'📚', val: enrolledCount, label:'Enrolled' },
            { icon:'✅', val: stats?.quizzesTaken || 0, label:'Quizzes' },
            { icon:'🏆', val: `${stats?.averageScore || 0}%`, label:'Avg Score' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign:'center', padding:'14px 8px' }}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <div style={{ fontSize:18, fontWeight:700, marginTop:4 }}>{s.val}</div>
              <div style={{ fontSize:10, color:'var(--text2)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Subjects */}
      <div className="section-title">📚 Subjects</div>
      {loading && <div className="spinner" />}
      {!loading && subjects.length === 0 && (
        <div className="empty"><div className="empty-icon">📭</div><h3>No subjects yet</h3></div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {subjects.map(s => {
          const status = isAdmin ? 'approved' : getEnrollStatus(s._id);
          const isEnrolling = enrolling[s._id];
          return (
            <div key={s._id} className="card"
              onClick={() => status === 'approved' ? navigate(`/subject/${s._id}`) : null}
              style={{ cursor: status==='approved' ? 'pointer' : 'default' }}>
              <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div style={{ width:52, height:52, borderRadius:14, flexShrink:0,
                  background: s.color || '#6C63FF',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>
                  {s.icon || '📚'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{s.name}</div>
                  {s.description && <div style={{ fontSize:12, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.description}</div>}
                  <div style={{ marginTop:6 }}>
                    {!isAdmin && status==='approved' && <span className="badge badge-green">✅ Enrolled</span>}
                    {!isAdmin && status==='pending'  && <span className="badge badge-yellow">⏳ Pending approval</span>}
                    {!isAdmin && status==='rejected' && <span className="badge badge-red">❌ Rejected</span>}
                  </div>
                </div>
                {status === 'approved'
                  ? <div style={{ color:'var(--text3)', fontSize:20 }}>›</div>
                  : !isAdmin && !status
                    ? <button className="btn btn-primary btn-sm" disabled={isEnrolling}
                        onClick={e => handleEnroll(e, s._id)}>
                        {isEnrolling ? '…' : 'Enroll'}
                      </button>
                    : !isAdmin && status === 'pending'
                      ? <span style={{ fontSize:11, color:'var(--text3)', textAlign:'right' }}>Waiting…</span>
                      : null
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
