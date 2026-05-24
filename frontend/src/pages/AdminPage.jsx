import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';
import { formatDate } from '../utils/helpers.js';

const inp = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--surface)', marginBottom: 12 };
const TABS = ['Students', 'Subjects', 'Feedback', 'Enrollments'];
const STATUS_COLOR = { pending: 'var(--warning)', approved: 'var(--success)', blocked: 'var(--danger)' };

export default function AdminPage() {
  const [tab, setTab]           = useState('Students');
  const [users, setUsers]       = useState([]);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null); // full student profile
  const [subjects, setSubjects] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [sForm, setSForm]       = useState({ name: '', description: '', icon: '📚', color: '#5B6CF9' });
  const [editingSub, setEditingSub] = useState(null);
  const [savingSub, setSavingSub] = useState(false);

  const loadUsers = useCallback(async (p = 1, s = search) => {
    setLoading(true);
    try {
      const res = await api.getUsers(p, s);
      setUsers(res.users); setPages(res.pages); setPage(p);
    } finally { setLoading(false); }
  }, [search]);

  const loadSubjects   = () => api.getSubjects().then(setSubjects);
  const loadFeedbacks  = () => api.getFeedbacks().then(setFeedbacks);
  const loadEnrollments= () => api.getPendingEnrollments().then(setEnrollments);

  useEffect(() => { loadUsers(1, ''); loadSubjects(); loadFeedbacks(); loadEnrollments(); }, []);
  useEffect(() => { const t = setTimeout(() => loadUsers(1, search), 400); return () => clearTimeout(t); }, [search]);

  const openStudent = async (u) => {
    const data = await api.getFullStudent(u.telegramId);
    setSelected(data);
  };

  const approve   = async (tid) => { await api.approveUser(tid); setUsers(u => u.map(x => x.telegramId === tid ? { ...x, status: 'approved' } : x)); if (selected?.user?.telegramId === tid) setSelected(s => ({ ...s, user: { ...s.user, status: 'approved' } })); };
  const block     = async (tid) => { if (!confirm('Block?')) return; await api.blockUser(tid); setUsers(u => u.map(x => x.telegramId === tid ? { ...x, status: 'blocked' } : x)); if (selected?.user?.telegramId === tid) setSelected(s => ({ ...s, user: { ...s.user, status: 'blocked' } })); };
  const unblock   = async (tid) => { await api.unblockUser(tid); setUsers(u => u.map(x => x.telegramId === tid ? { ...x, status: 'approved' } : x)); if (selected?.user?.telegramId === tid) setSelected(s => ({ ...s, user: { ...s.user, status: 'approved' } })); };

  const saveSub = async () => {
    setSavingSub(true);
    try {
      const fd = new FormData();
      Object.entries(editingSub || sForm).forEach(([k, v]) => v !== undefined && fd.append(k, v));
      if (editingSub?._id) { await api.updateSubject(editingSub._id, fd); }
      else { await api.createSubject(fd); }
      setSForm({ name: '', description: '', icon: '📚', color: '#5B6CF9' });
      setEditingSub(null);
      loadSubjects();
    } catch (e) { alert(e.message); }
    finally { setSavingSub(false); }
  };

  const delSub = async (id) => { if (!confirm('Delete subject?')) return; await api.deleteSubject(id); loadSubjects(); };

  const approveEnroll = async (id) => { await api.approveEnroll(id); loadEnrollments(); };
  const rejectEnroll  = async (id) => { await api.rejectEnroll(id); loadEnrollments(); };

  // ── Student detail view ─────────────────────────────────────────────────
  if (selected) {
    const { user: u, attempts, submissions, enrollments: enr, avgScore } = selected;
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>← Back</button>

        {/* Profile header */}
        <div className="card-gradient" style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px' }}>
          <Avatar src={u.profilePicUrl} name={u.fullName || u.firstName} size={72} border />
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 10 }}>{u.fullName || u.firstName}</h2>
          <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>🎓 {u.academicLevel || 'Level not set'}</div>
          <div style={{ marginTop: 8 }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>{u.status}</span>
          </div>
        </div>

        {/* Info */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Student Info</div>
          {[['@Username', `@${u.username || 'none'}`], ['Telegram ID', u.telegramId], ['Joined', formatDate(u.createdAt)], ['Last Seen', formatDate(u.lastSeen)], ['Avg Score', `${avgScore}%`]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)', minWidth: 110 }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {u.status === 'pending'  && <button className="btn btn-success" style={{ flex: 1 }} onClick={() => approve(u.telegramId)}>✅ Approve</button>}
          {u.status !== 'blocked' && u.role !== 'admin' && <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => block(u.telegramId)}>🚫 Block</button>}
          {u.status === 'blocked' && <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => unblock(u.telegramId)}>✅ Unblock</button>}
        </div>

        {/* Quiz history */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>❓ Quiz History ({attempts.length})</div>
          {attempts.length === 0 ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>No quizzes taken yet.</div> : attempts.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < attempts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.quiz?.title || 'Quiz'}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(a.submittedAt)}</div>
              </div>
              <div style={{ fontWeight: 700, color: a.percentage >= 70 ? 'var(--success)' : 'var(--warning)' }}>{a.score}/{a.total} ({a.percentage}%)</div>
            </div>
          ))}
        </div>

        {/* Homework submissions */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>📋 Homework ({submissions.length})</div>
          {submissions.length === 0 ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>No submissions yet.</div> : submissions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < submissions.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.homework?.title || 'HW'}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(s.submittedAt)}</div>
              </div>
              <span className={`badge ${s.status === 'graded' ? 'badge-green' : 'badge-yellow'}`}>{s.status === 'graded' ? `✅ ${s.grade}` : '⏳ Pending'}</span>
            </div>
          ))}
        </div>

        {/* Enrolled courses */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>📚 Enrolled Courses ({enr.filter(e => e.status === 'approved').length})</div>
          {enr.filter(e => e.status === 'approved').map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <div style={{ fontSize: 20 }}>{e.subject?.icon || '📚'}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.subject?.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main admin panel ────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>⚙️ Admin Panel</div>

      {/* Tabs */}
      <div className="tab-row" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} className={`tab-pill ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t} {t === 'Enrollments' && enrollments.length > 0 ? `(${enrollments.length})` : ''}
          </button>
        ))}
      </div>

      {/* ── Students ──────────────────────────────────────────────────────── */}
      {tab === 'Students' && (
        <>
          <input className="input" style={{ marginBottom: 14 }} placeholder="🔍 Search by name or username…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {loading && <div className="spinner" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => (
              <div key={u.telegramId} className="card" style={{ cursor: 'pointer' }} onClick={() => openStudent(u)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={u.profilePicUrl} name={u.fullName || u.firstName} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.fullName || u.firstName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>@{u.username || 'none'} · {u.academicLevel || 'No level'}</div>
                  </div>
                  <span className="badge" style={{ background: STATUS_COLOR[u.status] + '22', color: STATUS_COLOR[u.status] }}>{u.status}</span>
                </div>
              </div>
            ))}
          </div>
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => loadUsers(page - 1)}>← Prev</button>
              <span style={{ lineHeight: '32px', fontSize: 13 }}>{page}/{pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => loadUsers(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── Subjects ──────────────────────────────────────────────────────── */}
      {tab === 'Subjects' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{editingSub ? '✏️ Edit Subject' : '+ Add Subject'}</div>
            <input className="input" placeholder="Name" value={editingSub ? editingSub.name : sForm.name}
              onChange={e => editingSub ? setEditingSub(s => ({ ...s, name: e.target.value })) : setSForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Description (optional)" value={editingSub ? editingSub.description : sForm.description}
              onChange={e => editingSub ? setEditingSub(s => ({ ...s, description: e.target.value })) : setSForm(f => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input" placeholder="Icon emoji" style={{ flex: 1 }} value={editingSub ? editingSub.icon : sForm.icon}
                onChange={e => editingSub ? setEditingSub(s => ({ ...s, icon: e.target.value })) : setSForm(f => ({ ...f, icon: e.target.value }))} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: 'var(--text2)' }}>Color:</label>
                <input type="color" value={editingSub ? editingSub.color : sForm.color}
                  onChange={e => editingSub ? setEditingSub(s => ({ ...s, color: e.target.value })) : setSForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 40, height: 36, border: 'none', cursor: 'pointer', borderRadius: 8 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSub} disabled={savingSub}>
                {savingSub ? 'Saving…' : editingSub ? 'Save Changes' : '+ Add Subject'}
              </button>
              {editingSub && <button className="btn btn-ghost" onClick={() => setEditingSub(null)}>Cancel</button>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subjects.map(s => (
              <div key={s._id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                    {s.description && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{s.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingSub({ ...s })}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => delSub(s._id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Feedback ──────────────────────────────────────────────────────── */}
      {tab === 'Feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedbacks.length === 0 && <div className="empty"><div className="empty-icon">💬</div><h3>No feedback yet</h3></div>}
          {feedbacks.map((f, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.studentName}</div>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>@{f.username || 'none'}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>{formatDate(f.createdAt)}</span>
              </div>
              {f.text && <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{f.text}</p>}
              {f.fileUrl && (
                <a href={f.fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  {f.fileType === 'pdf' ? '📄 View PDF' : '🖼 View Image'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Enrollments ───────────────────────────────────────────────────── */}
      {tab === 'Enrollments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {enrollments.length === 0 && <div className="empty"><div className="empty-icon">📋</div><h3>No pending enrollment requests</h3></div>}
          {enrollments.map(e => (
            <div key={e._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.studentName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>wants to join: {e.subject?.icon} {e.subject?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(e.createdAt)}</div>
                </div>
                <span className="badge badge-yellow">Pending</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={() => approveEnroll(e._id)}>✅ Approve</button>
                <button className="btn btn-danger"  style={{ flex: 1 }} onClick={() => rejectEnroll(e._id)}>❌ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
