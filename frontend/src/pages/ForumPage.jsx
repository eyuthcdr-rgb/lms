import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Sheet from '../components/Sheet.jsx';
import Avatar from '../components/Avatar.jsx';
import { formatDate } from '../utils/helpers.js';

export default function ForumPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [showAsk, setShowAsk]     = useState(false);
  const [askForm, setAskForm]     = useState({ text: '', image: null });
  const [answerText, setAnswerText] = useState('');
  const [saving, setSaving]       = useState(false);

  const load = () => api.getQuestions(id).then(setQuestions).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const ask = async () => {
    if (!askForm.text.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id); fd.append('text', askForm.text);
      if (askForm.image) fd.append('image', askForm.image);
      await api.askQuestion(fd);
      setAskForm({ text: '', image: null }); setShowAsk(false); load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const answer = async () => {
    if (!answerText.trim()) return;
    await api.answerQuestion(selected._id, answerText);
    setAnswerText('');
    const updated = await api.getQuestions(id);
    setQuestions(updated);
    setSelected(updated.find(q => q._id === selected._id));
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(-1)}>←</button>
        <h1>💬 Forum</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAsk(true)}>+ Ask</button>
      </div>

      {!selected ? (
        <>
          {loading && <div className="spinner" />}
          {!loading && questions.length === 0 && <div className="empty"><div className="empty-icon">💬</div><h3>No questions yet</h3><p style={{ color:'var(--text2)', fontSize:14 }}>Be the first to ask!</p></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map(q => (
              <div key={q._id} className="card card-hover" onClick={() => setSelected(q)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {q.isPinned && <span className="badge badge-purple">📌 Pinned</span>}
                  {q.isResolved && <span className="badge badge-green">✅ Resolved</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{q.text}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Asked by {q.askerName}</div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text3)' }}>
                    <span>💬 {q.answers?.length || 0}</span>
                    <span>{formatDate(q.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>← All Questions</button>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {selected.isPinned && <span className="badge badge-purple">📌 Pinned</span>}
              {selected.isResolved && <span className="badge badge-green">✅ Resolved</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{selected.text}</div>
            {selected.imageUrl && <img src={selected.imageUrl} alt="" style={{ width:'100%', borderRadius:10, marginBottom:10, maxHeight:200, objectFit:'cover' }} />}
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Asked by {selected.askerName} · {formatDate(selected.createdAt)}</div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {!selected.isPinned && <button className="btn btn-ghost btn-sm" onClick={async () => { await api.pinQuestion(selected._id); load(); setSelected(q => ({ ...q, isPinned: true })); }}>📌 Pin</button>}
                {!selected.isResolved && <button className="btn btn-ghost btn-sm" onClick={async () => { await api.resolveQuestion(selected._id); setSelected(q => ({ ...q, isResolved: true })); }}>✅ Resolve</button>}
                <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('Delete?')) return; await api.deleteQuestion(selected._id); load(); setSelected(null); }}>🗑 Delete</button>
              </div>
            )}
          </div>

          <div className="section-title">{selected.answers?.length || 0} Answers</div>
          {[...(selected.answers || [])].sort((a,b) => b.isPinned - a.isPinned).map((a, i) => (
            <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${a.isPinned ? 'var(--green)' : a.isAdmin ? 'var(--accent)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.answererName}</div>
                  {a.isAdmin && <span className="badge badge-purple">👨‍🏫 Tutor</span>}
                  {a.isPinned && <span className="badge badge-green">📌 Best</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(a.createdAt)}</div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>{a.text}</p>
              {isAdmin && !a.isPinned && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                  onClick={() => api.pinAnswer(selected._id, a._id).then(() => { const updated = [...(selected.answers||[])]; updated[i] = { ...updated[i], isPinned: true }; setSelected(s => ({ ...s, answers: updated })); })}>
                  📌 Pin as best
                </button>
              )}
            </div>
          ))}
          {(!selected.answers || selected.answers.length === 0) && <div className="empty"><div className="empty-icon">💬</div><h3>No answers yet</h3></div>}

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Post an Answer</div>
            <textarea className="input" placeholder="Write your answer…" value={answerText} rows={4} onChange={e => setAnswerText(e.target.value)} style={{ marginBottom: 12, resize:'vertical' }} />
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={answer} disabled={!answerText.trim()}>Post Answer</button>
          </div>
        </>
      )}

      <Sheet open={showAsk} onClose={() => setShowAsk(false)} title="Ask a Question">
        <textarea className="input" placeholder="What would you like to know?" value={askForm.text} rows={5} onChange={e => setAskForm(f => ({ ...f, text: e.target.value }))} style={{ marginBottom: 12, resize:'vertical' }} />
        <label className="label">Attach Image (optional)</label>
        <input type="file" accept="image/*" style={{ marginBottom: 16, color:'var(--text2)', fontSize:13 }} onChange={e => setAskForm(f => ({ ...f, image: e.target.files[0] }))} />
        <button className="btn btn-primary" style={{ width:'100%' }} onClick={ask} disabled={saving || !askForm.text.trim()}>
          {saving ? 'Posting…' : 'Post Question'}
        </button>
      </Sheet>
    </div>
  );
}
