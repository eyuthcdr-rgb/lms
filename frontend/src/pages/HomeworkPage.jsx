import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Sheet from '../components/Sheet.jsx';
import PDFViewer from '../components/PDFViewer.jsx';
import { formatDate, isOverdue, getDaysLeft } from '../utils/helpers.js';

export default function HomeworkPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [homework, setHomework] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]   = useState({ title: '', description: '', dueDate: '', file: null });
  const [subForm, setSubForm] = useState({ note: '', file: null });
  const [saving, setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(null);
  const [gradeForm, setGradeForm] = useState({ grade: '', adminFeedback: '' });

  const load = () => api.getHomework(id).then(setHomework).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const openHW = async (hw) => {
    const { homework: full, mySubmission } = await api.getHomeworkItem(hw._id);
    setSelected({ ...full, mySubmission });
    if (isAdmin) { const subs = await api.getSubmissions(hw._id); setSubmissions(subs); }
  };

  const save = async () => {
    if (!form.title) return alert('Title required.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id); fd.append('title', form.title);
      fd.append('description', form.description);
      if (form.dueDate) fd.append('dueDate', form.dueDate);
      if (form.file) fd.append('file', form.file);
      if (editing) await api.updateHomework(editing._id, fd);
      else await api.createHomework(fd);
      setShowForm(false); setEditing(null);
      setForm({ title: '', description: '', dueDate: '', file: null });
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const submitHW = async () => {
    if (!subForm.file && !subForm.note) return alert('Add a file or note.');
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (subForm.file) fd.append('file', subForm.file);
      if (subForm.note) fd.append('note', subForm.note);
      await api.submitHomework(selected._id, fd);
      await openHW(selected);
      setSubForm({ note: '', file: null });
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const grade = async (subId) => {
    await api.gradeSubmission(subId, gradeForm);
    const subs = await api.getSubmissions(selected._id);
    setSubmissions(subs); setGrading(null);
  };

  const DueBadge = ({ dueDate }) => {
    if (!dueDate) return null;
    const days = getDaysLeft(dueDate);
    const over = isOverdue(dueDate);
    return (
      <span className={`badge ${over ? 'badge-red' : days <= 2 ? 'badge-yellow' : 'badge-blue'}`}>
        {over ? '⚠️ Overdue' : `📅 ${days}d left`}
      </span>
    );
  };

  if (selected) {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>← Back</button>
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selected.title}</h2>
          {selected.description && <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.7 }}>{selected.description}</p>}
          {selected.dueDate && (
            <div style={{ marginBottom: 10 }}>
              <DueBadge dueDate={selected.dueDate} />
              <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>Due: {formatDate(selected.dueDate)}</span>
            </div>
          )}
          {selected.fileUrl && <PDFViewer url={selected.fileUrl} title={selected.title} />}
        </div>

        {!isAdmin && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Your Submission</h3>
            {selected.mySubmission ? (
              <div>
                <span className={`badge ${selected.mySubmission.status === 'graded' ? 'badge-green' : 'badge-yellow'}`} style={{ marginBottom: 10, display:'inline-flex' }}>
                  {selected.mySubmission.status === 'graded' ? '✅ Graded' : '⏳ Awaiting grade'}
                </span>
                {selected.mySubmission.note && <p style={{ fontSize: 14, marginBottom: 8 }}>{selected.mySubmission.note}</p>}
                {selected.mySubmission.fileUrl && <a href={selected.mySubmission.fileUrl} target="_blank" rel="noreferrer" download className="btn btn-ghost btn-sm" style={{ display:'inline-flex', marginBottom:10 }}>⬇ Download your file</a>}
                {selected.mySubmission.status === 'graded' && (
                  <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 14, marginTop: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>Grade: {selected.mySubmission.grade}</div>
                    {selected.mySubmission.adminFeedback && <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>{selected.mySubmission.adminFeedback}</div>}
                  </div>
                )}
              </div>
            ) : (
              <>
                <textarea className="input" placeholder="Add a note (optional)" value={subForm.note} rows={3} onChange={e => setSubForm(f => ({ ...f, note: e.target.value }))} style={{ marginBottom: 12, resize: 'vertical' }} />
                <label className="label">Attach File (PDF or image)</label>
                <input type="file" accept=".pdf,image/*" style={{ marginBottom: 14, color: 'var(--text2)', fontSize: 13 }} onChange={e => setSubForm(f => ({ ...f, file: e.target.files[0] }))} />
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitHW} disabled={submitting}>
                  {submitting ? 'Submitting…' : '📤 Submit Homework'}
                </button>
              </>
            )}
          </div>
        )}

        {isAdmin && (
          <div>
            <div className="section-title">Submissions ({submissions.length})</div>
            {submissions.length === 0 && <div className="empty"><div className="empty-icon">📋</div><h3>No submissions yet</h3></div>}
            {submissions.map(sub => (
              <div key={sub._id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{sub.studentName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(sub.submittedAt)}</div>
                  </div>
                  <span className={`badge ${sub.status === 'graded' ? 'badge-green' : 'badge-yellow'}`}>{sub.status}</span>
                </div>
                {sub.note && <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{sub.note}</p>}
                {sub.fileUrl && <a href={sub.fileUrl} target="_blank" rel="noreferrer" download className="btn btn-ghost btn-sm" style={{ display:'inline-flex', marginBottom:10 }}>⬇ Download</a>}
                {sub.status === 'graded' ? (
                  <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--green)' }}>Grade: {sub.grade}</div>
                    {sub.adminFeedback && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{sub.adminFeedback}</div>}
                  </div>
                ) : grading === sub._id ? (
                  <div>
                    <input className="input" placeholder="Grade (e.g. A, 85/100)" value={gradeForm.grade} onChange={e => setGradeForm(f => ({ ...f, grade: e.target.value }))} style={{ marginBottom: 8 }} />
                    <textarea className="input" placeholder="Feedback (optional)" value={gradeForm.adminFeedback} rows={2} onChange={e => setGradeForm(f => ({ ...f, adminFeedback: e.target.value }))} style={{ marginBottom: 10, resize:'vertical' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => grade(sub._id)}>Save Grade</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setGrading(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => { setGrading(sub._id); setGradeForm({ grade: '', adminFeedback: '' }); }}>✏️ Grade</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(-1)}>←</button>
        <h1>📋 Homework</h1>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ title:'', description:'', dueDate:'', file:null }); setShowForm(true); }}>+ Add</button>}
      </div>

      {loading && <div className="spinner" />}
      {!loading && homework.length === 0 && <div className="empty"><div className="empty-icon">📋</div><h3>No assignments yet</h3></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {homework.map(hw => (
          <div key={hw._id} className="card card-hover" onClick={() => openHW(hw)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{hw.title}</div>
                {hw.description && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{hw.description.slice(0, 80)}{hw.description.length > 80 ? '…' : ''}</div>}
                {hw.dueDate && <DueBadge dueDate={hw.dueDate} />}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, marginLeft: 8 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditing(hw); setForm({ title:hw.title, description:hw.description||'', dueDate:hw.dueDate?.slice(0,10)||'', file:null }); setShowForm(true); }}>✏️</button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={async () => { if (!confirm('Delete?')) return; await api.deleteHomework(hw._id); load(); }}>🗑</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Assignment' : 'New Assignment'}>
        <label className="label">Title *</label>
        <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Assignment title" style={{ marginBottom: 12 }} />
        <label className="label">Description</label>
        <textarea className="input" value={form.description} rows={4} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions…" style={{ marginBottom: 12, resize:'vertical' }} />
        <label className="label">Due Date</label>
        <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ marginBottom: 12 }} />
        <label className="label">Attach File (optional)</label>
        <input type="file" accept=".pdf,image/*" style={{ marginBottom: 16, color: 'var(--text2)', fontSize: 13 }} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))} />
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Post Assignment'}
        </button>
      </Sheet>
    </div>
  );
}
