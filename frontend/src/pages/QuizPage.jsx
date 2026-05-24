import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Sheet from '../components/Sheet.jsx';
import { formatTime, formatDate, pct, scoreColor } from '../utils/helpers.js';

function emptyQ() { return { question: '', imageFile: null, options: ['', '', '', ''], answer: 0, explanation: '' }; }

export default function QuizPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quizzes, setQuizzes]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [taking, setTaking]       = useState(null);
  const [answers, setAnswers]     = useState([]);
  const [results, setResults]     = useState(null);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ title: '', timeLimit: '', maxAttempts: '3', questions: [emptyQ()] });
  const [saving, setSaving]       = useState(false);
  const [viewAttempts, setViewAttempts] = useState(null);
  const [myAttempts, setMyAttempts]     = useState([]);
  const timerRef = useRef(null);
  const saveRef  = useRef(null);

  const load = () => api.getQuizzes(id).then(setQuizzes).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);
  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(saveRef.current); }, []);

  const startQuiz = async (quiz) => {
    const { quiz: full, attempt } = await api.getQuiz(quiz._id);
    // Check attempts
    const myAtts = await api.getMyAttempts(quiz._id);
    setMyAttempts(myAtts);
    const submitted = myAtts.filter(a => a.status === 'submitted').length;
    if (full.maxAttempts && submitted >= full.maxAttempts) {
      return alert(`You have used all ${full.maxAttempts} attempts for this quiz.`);
    }
    setTaking(full);
    setResults(null);
    const saved = attempt?.answers || new Array(full.questions.length).fill(null);
    const savedTime = attempt?.timeRemaining ?? (full.timeLimit || 0);
    setAnswers(saved);
    await api.startQuiz(full._id);
    if (full.timeLimit > 0) {
      setTimeLeft(savedTime);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); autoSubmit(full._id); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    saveRef.current = setInterval(() => {
      setAnswers(cur => { setTimeLeft(t => { api.saveQuiz(full._id, cur, t).catch(() => {}); return t; }); return cur; });
    }, 30000);
  };

  const autoSubmit = async (qid) => {
    clearInterval(saveRef.current);
    setAnswers(cur => { api.submitQuiz(qid, cur).then(r => setResults(r)).catch(() => {}); return cur; });
  };

  const submit = async () => {
    if (answers.includes(null)) return alert('Please answer all questions first.');
    clearInterval(timerRef.current); clearInterval(saveRef.current);
    const res = await api.submitQuiz(taking._id, answers);
    setResults(res);
  };

  const del = async (qid) => {
    if (!confirm('Delete quiz?')) return;
    await api.deleteQuiz(qid);
    setQuizzes(q => q.filter(x => x._id !== qid));
  };

  const startEdit = (q) => {
    setEditing(q);
    setForm({ title: q.title, timeLimit: q.timeLimit ? String(Math.round(q.timeLimit/60)) : '', maxAttempts: String(q.maxAttempts || 3), questions: q.questions?.map(qq => ({ ...qq, imageFile: null })) || [emptyQ()] });
    setShowForm(true);
  };

  const saveQuiz = async () => {
    if (!form.title) return alert('Quiz title required.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id);
      fd.append('title', form.title);
      if (form.timeLimit) fd.append('timeLimit', parseInt(form.timeLimit) * 60);
      fd.append('maxAttempts', form.maxAttempts || 3);
      const qs = form.questions.map(({ imageFile, ...q }) => q);
      fd.append('questions', JSON.stringify(qs));
      form.questions.forEach((q, i) => { if (q.imageFile) fd.append(`image_${i}`, q.imageFile); });
      if (editing) await api.updateQuiz(editing._id, fd);
      else await api.createQuiz(fd);
      setShowForm(false); setEditing(null);
      setForm({ title: '', timeLimit: '', maxAttempts: '3', questions: [emptyQ()] });
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  // ── Results screen ──────────────────────────────────────────────────────────
  if (taking && results) {
    const p = pct(results.score, results.total);
    return (
      <div className="page">
        <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{p >= 80 ? '🏆' : p >= 60 ? '✅' : '📖'}</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor(p) }}>{p}%</div>
          <div style={{ fontSize: 18, color: 'var(--text2)', marginTop: 4 }}>{results.score}/{results.total} correct</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <span className="badge badge-green">✅ {results.score} correct</span>
            <span className="badge badge-red">❌ {results.total - results.score} wrong</span>
          </div>
        </div>
        {taking.questions.map((q, i) => (
          <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${results.results[i].correct ? 'var(--green)' : 'var(--red)'}` }}>
            {q.imageUrl && <img src={q.imageUrl} alt="" style={{ width:'100%', borderRadius:8, marginBottom:8, maxHeight:180, objectFit:'cover' }} />}
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{i+1}. {q.question}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Your answer: <b style={{ color: results.results[i].correct ? 'var(--green)' : 'var(--red)' }}>{q.options?.[answers[i]] || '—'}</b></div>
            {!results.results[i].correct && <div style={{ fontSize: 13, color: 'var(--green)', marginTop: 4 }}>✅ Correct: {q.options?.[results.results[i].correctAnswer]}</div>}
            {results.results[i].explanation && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text3)', marginTop: 6 }}>💡 {results.results[i].explanation}</div>}
          </div>
        ))}
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => { setTaking(null); setResults(null); }}>← Back to Quizzes</button>
      </div>
    );
  }

  // ── Taking quiz ─────────────────────────────────────────────────────────────
  if (taking) {
    const answered = answers.filter(a => a !== null).length;
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{taking.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{answered}/{taking.questions.length} answered</div>
          </div>
          {taking.timeLimit > 0 && (
            <div style={{ padding: '8px 16px', borderRadius: 20, fontWeight: 800, fontSize: 18, background: timeLeft < 60 ? 'rgba(255,107,107,0.15)' : 'var(--surface2)', color: timeLeft < 60 ? 'var(--red)' : 'var(--text)', border: `1px solid ${timeLeft < 60 ? 'rgba(255,107,107,0.3)' : 'var(--border)'}` }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
        </div>
        <div className="progress-bar" style={{ marginBottom: 20 }}>
          <div className="progress-fill" style={{ width: `${(answered/taking.questions.length)*100}%` }} />
        </div>
        {taking.questions.map((q, i) => (
          <div key={i} className="card" style={{ marginBottom: 12 }}>
            {q.imageUrl && <img src={q.imageUrl} alt="" style={{ width:'100%', borderRadius:8, marginBottom:10, maxHeight:200, objectFit:'cover' }} />}
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{i+1}. {q.question}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(q.options || []).map((opt, j) => (
                <button key={j} className={`option-btn${answers[i] === j ? ' selected' : ''}`} onClick={() => setAnswers(a => { const c = [...a]; c[i] = j; return c; })}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${answers[i] === j ? 'var(--accent)' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, color: answers[i] === j ? 'var(--accent)' : 'var(--text3)' }}>{String.fromCharCode(65+j)}</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: 15 }} onClick={submit}>
          Submit Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(-1)}>←</button>
        <h1>❓ Quizzes</h1>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ title:'', timeLimit:'', maxAttempts:'3', questions:[emptyQ()] }); setShowForm(true); }}>+ Add</button>}
      </div>

      {loading && <div className="spinner" />}
      {!loading && quizzes.length === 0 && <div className="empty"><div className="empty-icon">❓</div><h3>No quizzes yet</h3></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {quizzes.map(q => (
          <div key={q._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{q.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, display: 'flex', gap: 10 }}>
                  <span>❓ {q.questions?.length || 0} questions</span>
                  {q.timeLimit ? <span>⏱ {Math.round(q.timeLimit/60)} min</span> : <span>⏱ No limit</span>}
                  <span>🔁 {q.maxAttempts || '∞'} attempts</span>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => startEdit(q)}>✏️</button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => del(q._id)}>🗑</button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => startQuiz(q)}>▶ Start Quiz</button>
              {isAdmin && <button className="btn btn-ghost btn-sm" onClick={async () => { const a = await api.getAllAttempts(q._id); setViewAttempts({ quiz: q, attempts: a }); }}>📊 Results</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Admin: View all attempts */}
      <Sheet open={!!viewAttempts} onClose={() => setViewAttempts(null)} title={`Results: ${viewAttempts?.quiz?.title}`}>
        {viewAttempts?.attempts?.length === 0 && <div className="empty"><div className="empty-icon">📊</div><h3>No attempts yet</h3></div>}
        {viewAttempts?.attempts?.map((a, i) => (
          <div key={i} className="list-item">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Student #{a.student}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(a.submittedAt)}</div>
            </div>
            <div style={{ fontWeight: 700, color: scoreColor(pct(a.score, a.total)) }}>{a.score}/{a.total} ({pct(a.score, a.total)}%)</div>
          </div>
        ))}
      </Sheet>

      {/* Add/Edit quiz sheet */}
      <Sheet open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Quiz' : 'New Quiz'}>
        <label className="label">Quiz Title *</label>
        <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Quiz title" style={{ marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label className="label">Time Limit (min)</label>
            <input className="input" type="number" value={form.timeLimit} onChange={e => setForm(f => ({ ...f, timeLimit: e.target.value }))} placeholder="0 = no limit" />
          </div>
          <div>
            <label className="label">Max Attempts</label>
            <input className="input" type="number" value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: e.target.value }))} placeholder="e.g. 3" />
          </div>
        </div>

        {form.questions.map((q, qi) => (
          <div key={qi} style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>Question {qi+1}</div>
            <input className="input" placeholder="Question text" value={q.question}
              onChange={e => setForm(f => { const qs = [...f.questions]; qs[qi] = { ...qs[qi], question: e.target.value }; return { ...f, questions: qs }; })}
              style={{ marginBottom: 10 }} />
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>
              📷 Attach image (optional):
              <input type="file" accept="image/*" style={{ display:'block', marginTop:4, fontSize:12 }}
                onChange={e => setForm(f => { const qs = [...f.questions]; qs[qi] = { ...qs[qi], imageFile: e.target.files[0] }; return { ...f, questions: qs }; })} />
            </label>
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input type="radio" name={`q${qi}`} checked={q.answer === oi}
                  onChange={() => setForm(f => { const qs = [...f.questions]; qs[qi] = { ...qs[qi], answer: oi }; return { ...f, questions: qs }; })}
                  style={{ width:18, height:18, accentColor:'var(--accent)', flexShrink:0 }} />
                <input className="input" placeholder={`Option ${String.fromCharCode(65+oi)}`} value={opt}
                  onChange={e => setForm(f => { const qs = [...f.questions]; const opts = [...qs[qi].options]; opts[oi] = e.target.value; qs[qi] = { ...qs[qi], options: opts }; return { ...f, questions: qs }; })}
                  style={{ marginBottom: 0 }} />
              </div>
            ))}
            <input className="input" placeholder="Explanation (shown after answer)" value={q.explanation}
              onChange={e => setForm(f => { const qs = [...f.questions]; qs[qi] = { ...qs[qi], explanation: e.target.value }; return { ...f, questions: qs }; })}
              style={{ marginTop: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>⬆ Select radio button next to the correct option</div>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ width:'100%', marginBottom:12 }}
          onClick={() => setForm(f => ({ ...f, questions: [...f.questions, emptyQ()] }))}>+ Add Question</button>
        <button className="btn btn-primary" style={{ width:'100%' }} onClick={saveQuiz} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Quiz'}
        </button>
      </Sheet>
    </div>
  );
}
