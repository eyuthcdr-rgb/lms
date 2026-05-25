import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';
import { formatDate } from '../utils/helpers.js';

const TABS = ['Students', 'Subjects', 'Feedback', 'Enrollments'];
const STATUS_COLOR = {
  pending:  '#FFD166',
  approved: '#00D4AA',
  blocked:  '#FF6B6B',
};

const inp = {
  width: '100%', padding: '12px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 10, fontSize: 14,
  fontFamily: 'inherit', outline: 'none',
  background: 'var(--surface2)',
  color: 'var(--text)',
  marginBottom: 12,
};

export default function AdminPage() {
  const [tab, setTab]             = useState('Students');
  const [users, setUsers]         = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [subjects, setSubjects]   = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [sForm, setSForm]         = useState({ name: '', description: '', icon: '📚', color: '#6C63FF' });
  const [editingSub, setEditingSub] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const loadUsers = useCallback(async (p = 1, s = '') => {
    setLoading(true);
    try {
      const res = await api.getUsers(p, s);
      setUsers(res.users || []);
      setTotalPages(res.pages || 1);
      setPage(p);
    } catch (e) {
      console.error('loadUsers error:', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubjects = async () => {
    try { const s = await api.getSubjects(); setSubjects(s || []); }
    catch (e) { console.error('loadSubjects:', e); setSubjects([]); }
  };

  const loadFeedbacks = async () => {
    try { const f = await api.getFeedbacks(); setFeedbacks(f || []); }
    catch (e) { console.error('loadFeedbacks:', e); setFeedbacks([]); }
  };

  const loadEnrollments = async () => {
    try { const e = await api.getPendingEnrollments(); setEnrollments(e || []); }
    catch (e) { console.error('loadEnrollments:', e); setEnrollments([]); }
  };

  useEffect(() => {
    loadUsers(1, '');
    loadSubjects();
    loadFeedbacks();
    loadEnrollments();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(1, search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const openStudent = async (u) => {
    try {
      const data = await api.getFullStudent(u.telegramId);
      setSelected(data);
    } catch (e) {
      alert('Could not load student profile: ' + e.message);
    }
  };

  const approve = async (tid) => {
    try {
      await api.approveUser(tid);
      setUsers(u => u.map(x => x.telegramId === tid ? { ...x, status: 'approved' } : x));
      if (selected?.user?.telegramId === tid) setSelected(s => ({ ...s, user: { ...s.user, status: 'approved' } }));
    } catch (e) { alert(e.message); }
  };

  const block = async (tid) => {
    if (!confirm('Block this student?')) return;
    try {
      await api.blockUser(tid);
      setUsers(u => u.map(x => x.telegramId === tid ? { ...x, status: 'blocked' } : x));
      if (selected?.user?.telegramId === tid) setSelected(s => ({ ...s, user: { ...s.user, status: 'blocked' } }));
    } catch (e) { alert(e.message); }
  };

  const unblock = async (tid) => {
    try {
      await api.unblockUser(tid);
      setUsers(u => u.map(x => x.telegramId === tid ? { ...x, status: 'approved' } : x));
      if (selected?.user?.telegramId === tid) setSelected(s => ({ ...s, user: { ...s.user, status: 'approved' } }));
    } catch (e) { alert(e.message); }
  };

  const saveSub = async () => {
    const f = editingSub || sForm;
    if (!f.name) return alert('Name required');
    setSaving(true);
    try {
      const data = {
        name: f.name,
        description: f.description || '',
        icon: f.icon || '📚',
        color: f.color || '#6C63FF',
      };
      if (editingSub?._id) {
        await api.updateSubject(editingSub._id, data);
      } else {
        await api.createSubject(data);
      }
      setSForm({ name: '', description: '', icon: '📚', color: '#6C63FF' });
      setEditingSub(null);
      await loadSubjects();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const delSub = async (id) => {
    if (!confirm('Delete this subject and all its content?')) return;
    try { await api.deleteSubject(id); setSubjects(s => s.filter(x => x._id !== id)); }
    catch (e) { alert(e.message); }
  };

  const approveEnroll = async (id) => {
    try { await api.approveEnroll(id); await loadEnrollments(); }
    catch (e) { alert(e.message); }
  };

  const rejectEnroll = async (id) => {
    try { await api.rejectEnroll(id); await loadEnrollments(); }
    catch (e) { alert(e.message); }
  };

  // ── Student detail ────────────────────────────────────────────────────────
  if (selected) {
    const u   = selected.user || {};
    const att = selected.attempts || [];
    const sub = selected.submissions || [];
    const enr = selected.enrollments || [];
    const avg = selected.avgScore || 0;

    return (
      <div className="page">
        <button onClick={() => setSelected(null)}
          style={{ background: 'var(--surface2)', border: 'none', borderRadius: 10, padding: '8px 16px', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ← Back
        </button>

        {/* Profile header */}
        <div style={{ background: 'linear-gradient(135deg, #6C63FF, #9B59B6)', borderRadius: 16, padding: '24px 20px', textAlign: 'center', marginBottom: 16 }}>
          <Avatar src={u.profilePicUrl} name={u.fullName || u.firstName || '?'} size={72} />
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 10 }}>
            {u.fullName || u.firstName || 'Unknown'}
          </h2>
          <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, marginTop: 4 }}>
            🎓 {u.academicLevel || 'Level not set'}
          </div>
          <div style={{ marginTop: 10, display: 'inline-block', padding: '3px 14px', borderRadius: 20, background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            {u.status}
          </div>
        </div>

        {/* Info */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Student Info</div>
          {[
            ['Username',   `@${u.username || 'none'}`],
            ['Telegram ID', String(u.telegramId || '—')],
            ['Joined',      formatDate(u.createdAt)],
            ['Last Seen',   formatDate(u.lastSeen)],
            ['Avg Score',   `${avg}%`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)', minWidth: 110 }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {u.status === 'pending' && (
            <button onClick={() => approve(u.telegramId)}
              style={{ flex: 1, padding: '10px', background: '#00D4AA', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              ✅ Approve
            </button>
          )}
          {u.status !== 'blocked' && u.role !== 'admin' && (
            <button onClick={() => block(u.telegramId)}
              style={{ flex: 1, padding: '10px', background: '#FF6B6B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              🚫 Block
            </button>
          )}
          {u.status === 'blocked' && (
            <button onClick={() => unblock(u.telegramId)}
              style={{ flex: 1, padding: '10px', background: 'var(--grad1)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              ✅ Unblock
            </button>
          )}
        </div>

        {/* Quiz history */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>❓ Quiz History ({att.length})</div>
          {att.length === 0
            ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>No quizzes taken yet.</div>
            : att.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < att.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.quiz?.title || 'Quiz'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(a.submittedAt)}</div>
                </div>
                <div style={{ fontWeight: 700, color: (a.percentage || 0) >= 70 ? '#00D4AA' : '#FFD166' }}>
                  {a.score || 0}/{a.total || 0} ({a.percentage || 0}%)
                </div>
              </div>
            ))
          }
        </div>

        {/* Homework */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>📋 Homework ({sub.length})</div>
          {sub.length === 0
            ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>No submissions yet.</div>
            : sub.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < sub.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.homework?.title || 'Homework'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(s.submittedAt)}</div>
                </div>
                <div style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.status === 'graded' ? 'rgba(0,212,170,.15)' : 'rgba(255,209,102,.15)', color: s.status === 'graded' ? '#00D4AA' : '#FFD166' }}>
                  {s.status === 'graded' ? `✅ ${s.grade}` : '⏳ Pending'}
                </div>
              </div>
            ))
          }
        </div>

        {/* Enrolled courses */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>📚 Enrolled Courses</div>
          {enr.filter(e => e.status === 'approved').length === 0
            ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>Not enrolled in any course.</div>
            : enr.filter(e => e.status === 'approved').map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ fontSize: 20 }}>{e.subject?.icon || '📚'}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{e.subject?.name || 'Subject'}</span>
              </div>
            ))
          }
        </div>
      </div>
    );
  }

  // ── Main panel ─────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 20 }}>⚙️ Admin Panel</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              flexShrink: 0, padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: '1.5px solid',
              borderColor: tab === t ? 'transparent' : 'var(--border)',
              background: tab === t ? 'linear-gradient(135deg, #6C63FF, #9B59B6)' : 'var(--surface2)',
              color: tab === t ? '#fff' : 'var(--text2)',
              fontFamily: 'inherit',
            }}>
            {t}{t === 'Enrollments' && enrollments.length > 0 ? ` (${enrollments.length})` : ''}
          </button>
        ))}
      </div>

      {/* ── Students ── */}
      {tab === 'Students' && (
        <>
          <input style={inp} placeholder="🔍 Search by name or username…"
            value={search} onChange={e => setSearch(e.target.value)} />

          {loading && <div className="spinner" />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => (
              <div key={u.telegramId} className="card" style={{ cursor: 'pointer' }}
                onClick={() => openStudent(u)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={u.profilePicUrl} name={u.fullName || u.firstName || '?'} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.fullName || u.firstName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>@{u.username || 'none'} · {u.academicLevel || 'No level'}</div>
                  </div>
                  <div style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0, background: (STATUS_COLOR[u.status] || '#ccc') + '22', color: STATUS_COLOR[u.status] || 'var(--text2)' }}>
                    {u.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && users.length === 0 && (
            <div className="empty">
              <div className="empty-icon">👥</div>
              <h3>No students found</h3>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
              <button disabled={page === 1} onClick={() => loadUsers(page - 1, search)}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                ← Prev
              </button>
              <span style={{ lineHeight: '36px', fontSize: 13 }}>{page}/{totalPages}</span>
              <button disabled={page === totalPages} onClick={() => loadUsers(page + 1, search)}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Subjects ── */}
      {tab === 'Subjects' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>
              {editingSub ? '✏️ Edit Subject' : '+ New Subject'}
            </div>
            {['name','description','icon'].map(field => (
              <input key={field} style={inp} placeholder={field.charAt(0).toUpperCase() + field.slice(1) + (field === 'icon' ? ' (emoji)' : '')}
                value={editingSub ? (editingSub[field] || '') : (sForm[field] || '')}
                onChange={e => editingSub
                  ? setEditingSub(s => ({ ...s, [field]: e.target.value }))
                  : setSForm(f => ({ ...f, [field]: e.target.value }))} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)' }}>Color:</label>
              <input type="color"
                value={editingSub ? editingSub.color : sForm.color}
                onChange={e => editingSub
                  ? setEditingSub(s => ({ ...s, color: e.target.value }))
                  : setSForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 44, height: 36, border: 'none', cursor: 'pointer', borderRadius: 8, background: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveSub} disabled={saving}
                style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#6C63FF,#9B59B6)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                {saving ? 'Saving…' : editingSub ? 'Save Changes' : 'Add Subject'}
              </button>
              {editingSub && (
                <button onClick={() => setEditingSub(null)}
                  style={{ padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subjects.map(s => (
              <div key={s._id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: s.color || '#6C63FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {s.icon || '📚'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                    {s.description && <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setEditingSub({ ...s })}
                      style={{ padding: '6px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      ✏️
                    </button>
                    <button onClick={() => delSub(s._id)}
                      style={{ padding: '6px 12px', background: 'rgba(255,107,107,.15)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#FF6B6B', fontWeight: 600, fontSize: 13 }}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <div className="empty"><div className="empty-icon">📚</div><h3>No subjects yet</h3></div>}
          </div>
        </>
      )}

      {/* ── Feedback ── */}
      {tab === 'Feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedbacks.length === 0 && <div className="empty"><div className="empty-icon">💬</div><h3>No feedback yet</h3></div>}
          {feedbacks.map((f, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.studentName}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>@{f.username || 'none'}</div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>{formatDate(f.createdAt)}</div>
              </div>
              {f.text && <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: f.fileUrl ? 10 : 0 }}>{f.text}</p>}
              {f.fileUrl && (
                <a href={f.fileUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13, color: 'var(--text)', fontWeight: 600, textDecoration: 'none' }}>
                  {f.fileType === 'pdf' ? '📄' : '🖼'} View attachment
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Enrollments ── */}
      {tab === 'Enrollments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {enrollments.length === 0 && <div className="empty"><div className="empty-icon">📋</div><h3>No pending enrollment requests</h3></div>}
          {enrollments.map(e => (
            <div key={e._id} className="card">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{e.studentName}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>
                  wants to join: {e.subject?.icon} {e.subject?.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{formatDate(e.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => approveEnroll(e._id)}
                  style={{ flex: 1, padding: '10px', background: '#00D4AA', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                  ✅ Approve
                </button>
                <button onClick={() => rejectEnroll(e._id)}
                  style={{ flex: 1, padding: '10px', background: '#FF6B6B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
