import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Sheet from '../components/Sheet.jsx';
import PDFViewer from '../components/PDFViewer.jsx';
import { formatDate } from '../utils/helpers.js';

export default function NotesPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [viewing, setViewing]   = useState(null);
  const [editing, setEditing]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', content: '', file: null, pinned: false });
  const [saving, setSaving]     = useState(false);

  const load = () => api.getNotes(id).then(setNotes).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (!form.title) return alert('Title required.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id);
      fd.append('title', form.title);
      fd.append('content', form.content);
      fd.append('pinned', form.pinned);
      if (form.file) fd.append('file', form.file);
      if (editing) await api.updateNote(editing._id, fd);
      else await api.createNote(fd);
      setShowForm(false); setEditing(null);
      setForm({ title: '', content: '', file: null, pinned: false });
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (nid) => {
    if (!confirm('Delete this note?')) return;
    await api.deleteNote(nid);
    setNotes(n => n.filter(x => x._id !== nid));
  };

  const openView = async (note) => {
    setViewing(note);
    if (!isAdmin) api.markNoteRead(note._id).catch(() => {});
  };

  const startEdit = (note) => {
    setEditing(note);
    setForm({ title: note.title, content: note.content, file: null, pinned: note.pinned });
    setShowForm(true);
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(-1)}>←</button>
        <h1>📝 Notes</h1>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ title:'', content:'', file:null, pinned:false }); setShowForm(true); }}>+ Add</button>}
      </div>

      {loading && <div className="spinner" />}
      {!loading && notes.length === 0 && <div className="empty"><div className="empty-icon">📝</div><h3>No notes yet</h3></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map(n => (
          <div key={n._id} className="card card-hover" style={{ cursor: 'pointer' }} onClick={() => openView(n)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {n.pinned && <span className="badge badge-yellow" style={{ marginBottom: 6, display: 'inline-flex' }}>📌 Pinned</span>}
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{n.title}</div>
                {n.content && <div style={{ fontSize: 13, color: 'var(--text2)', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{n.content}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  {n.fileUrl && <span className="badge badge-blue">📄 {n.fileType === 'pdf' ? 'PDF' : 'Image'}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(n.createdAt)}</span>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => startEdit(n)} title="Edit">✏️</button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => del(n._id)} title="Delete">🗑</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View sheet */}
      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title}>
        {viewing && (
          <>
            {viewing.pinned && <span className="badge badge-yellow" style={{ marginBottom: 12, display:'inline-flex' }}>📌 Pinned</span>}
            {viewing.content && <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text2)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>{viewing.content}</p>}
            {viewing.fileUrl && <PDFViewer url={viewing.fileUrl} title={viewing.title} />}
          </>
        )}
      </Sheet>

      {/* Add/Edit sheet */}
      <Sheet open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Note' : 'New Note'}>
        <label className="label">Title</label>
        <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Note title" style={{ marginBottom: 12 }} />
        <label className="label">Content</label>
        <textarea className="input" value={form.content} rows={5} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your note here…" style={{ marginBottom: 12, resize: 'vertical' }} />
        <label className="label">Attach PDF or Image (optional)</label>
        <input type="file" accept=".pdf,image/*" style={{ marginBottom: 12, color: 'var(--text2)', fontSize: 13 }} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))} />
        {editing?.fileUrl && !form.file && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Current file: </span>
            <a href={editing.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>View current file</a>
          </div>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
          <span style={{ fontSize: 14 }}>📌 Pin this note</span>
        </label>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Note'}
        </button>
      </Sheet>
    </div>
  );
}
