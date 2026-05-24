import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';
import { formatDate } from '../utils/helpers.js';

const inp = {
  width: '100%', padding: '12px 14px',
  border: '1.5px solid var(--border)', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
  background: 'var(--surface)', marginBottom: 12,
};

export default function ProfilePage({ user: currentUser }) {
  const [user, setUser]       = useState(currentUser);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [feedback, setFeedback] = useState('');
  const [fbFile, setFbFile]   = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.getMe().then(u => { setUser(u); setForm({ fullName: u.fullName || '', academicLevel: u.academicLevel || '', bio: u.bio || '' }); });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      const updated = await api.updateProfile(fd);
      setUser(updated);
      setEditing(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const sendFeedback = async () => {
    if (!feedback.trim()) return;
    setSending(true);
    try {
      await api.sendFeedback(feedback, fbFile);
      setFeedback(''); setFbFile(null); setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) { alert(e.message); }
    finally { setSending(false); }
  };

  if (!user) return <div className="spinner" style={{ marginTop: 80 }} />;

  return (
    <div className="page">
      {/* Profile card */}
      <div className="card-gradient" style={{ marginBottom: 16, textAlign: 'center', padding: '28px 20px' }}>
        <Avatar src={user.profilePicUrl} name={user.fullName || user.firstName} size={80} border />
        <h2 style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: '#fff' }}>
          {user.fullName || user.firstName}
        </h2>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
          {user.academicLevel || 'Level not set'} {user.role === 'admin' ? '· 👨‍💼 Admin' : '· 🎓 Student'}
        </div>
        <div style={{ marginTop: 10 }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 12 }}>
            {user.status === 'approved' ? '✅ Active' : user.status}
          </span>
        </div>
      </div>

      {/* Details card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Profile Details</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e => !e)}>
            {editing ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>

        {editing ? (
          <>
            <input style={inp} placeholder="Full Name" value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            <input style={inp} placeholder="Academic Level (e.g. Grade 10)" value={form.academicLevel}
              onChange={e => setForm(f => ({ ...f, academicLevel: e.target.value }))} />
            <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Bio (optional)" value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            <button className="btn btn-primary btn-full" onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['📛 Full Name', user.fullName || '—'],
              ['🎓 Academic Level', user.academicLevel || '—'],
              ['🔖 Username', `@${user.username || 'none'}`],
              ['📅 Joined', formatDate(user.createdAt)],
              ['💬 Bio', user.bio || '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', minWidth: 130 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback — students only */}
      {!isAdmin && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>💬 Send Feedback</div>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={4}
            placeholder="Share thoughts, report issues, suggest features…"
            value={feedback} onChange={e => setFeedback(e.target.value)} />
          <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 12 }}>
            Attach image (optional):
            <input type="file" accept="image/*,.pdf" style={{ display: 'block', marginTop: 4 }}
              onChange={e => setFbFile(e.target.files[0])} />
          </label>
          {sent && <div style={{ color: 'var(--success)', fontSize: 13, marginBottom: 8 }}>✅ Sent! Thank you.</div>}
          <button className="btn btn-primary btn-full" onClick={sendFeedback}
            disabled={sending || !feedback.trim()}>
            {sending ? 'Sending…' : '📤 Send Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
