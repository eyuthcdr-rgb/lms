import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatTime } from '../utils/helpers.js';

const S = {
  width:'100%', padding:'10px 12px', border:'1.5px solid var(--border)',
  borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none',
  background:'var(--surface2)', color:'var(--text)', marginBottom:10,
};

// Detect question type reliably
function getType(q) {
  if (!q) return 'mcq';
  if (q.type === 'truefalse') return 'truefalse';
  if (q.type === 'short') return 'short';
  if (q.type === 'mcq') return 'mcq';
  // fallback for old data
  if (!q.options || q.options.length === 0) return 'short';
  const filled = (q.options || []).filter(o => o && o.trim());
  if (filled.length === 0) return 'short';
  return 'mcq';
}

// Get display options for MCQ (only filled ones, keep original index)
function getMCQOptions(q) {
  return (q.options || []).map((opt, idx) => ({ opt, idx })).filter(({ opt }) => opt && opt.trim());
}

export default function QuizPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [view, setView]         = useState('list');
  const [quizzes, setQuizzes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [active, setActive]     = useState(null);
  const [answers, setAnswers]   = useState([]);
  const [results, setResults]   = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirm, setConfirm]   = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [grading, setGrading]   = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    title:'', timeLimit:'0', maxAttempts:'0',
    questions:[{ question:'', type:'mcq', options:['','','',''], answer:0, explanation:'', maxScore:1 }]
  });
  const timerRef = useRef(null);
  const saveRef  = useRef(null);

  const load = () => api.getQuizzes(id).then(setQuizzes).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);
  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(saveRef.current); }, []);

  const startQuiz = async (quiz) => {
    try {
      const { quiz: full, attempt } = await api.getQuiz(quiz._id);
      setActive(full);
      setResults(null);
      setError('');
      const initAnswers = attempt?.rawAnswers || new Array(full.questions.length).fill(null);
      setAnswers(initAnswers);
      await api.startQuiz(full._id);
      if (full.timeLimit > 0) {
        const startTime = attempt?.timeRemaining ?? full.timeLimit;
        setTimeLeft(startTime);
        timerRef.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) { clearInterval(timerRef.current); submitAnswers(full._id); return 0; }
            return t - 1;
          });
        }, 1000);
      }
      saveRef.current = setInterval(() => {
        setAnswers(cur => {
          setTimeLeft(t => { api.saveQuiz(full._id, cur, t).catch(() => {}); return t; });
          return cur;
        });
      }, 15000);
      setView('take');
    } catch (e) { alert(e.message); }
  };

  const submitAnswers = async (qid, ans) => {
    clearInterval(timerRef.current);
    clearInterval(saveRef.current);
    const finalAns = ans || answers;
    try {
      const res = await api.submitQuiz(qid || active._id, finalAns);
      setResults(res);
      setView('result');
    } catch (e) { alert(e.message); }
  };

  const openSubmissions = async (quiz) => {
    try {
      const atts = await api.getAllAttempts(quiz._id);
      setSubmissions(atts);
      setActive(quiz);
      setView('submissions');
    } catch (e) { alert(e.message); }
  };

  const saveGrade = async (attemptId, qi) => {
    if (gradeScore === '') return alert('Enter a score');
    try {
      await api.gradeQuizAnswer(active._id, attemptId, { questionIndex: qi, score: +gradeScore });
      setGrading(null);
      setGradeScore('');
      const atts = await api.getAllAttempts(active._id);
      setSubmissions(atts);
    } catch (e) { alert(e.message); }
  };

  const saveQuiz = async () => {
    if (!form.title.trim()) return setError('Title is required');
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.question.trim()) return setError(`Question ${i+1} text is required`);
      if (q.type === 'mcq') {
        const filled = q.options.filter(o => o.trim());
        if (filled.length < 2) return setError(`Question ${i+1} needs at least 2 options`);
      }
    }
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id);
      fd.append('title', form.title);
      fd.append('timeLimit', form.timeLimit || '0');
      fd.append('maxAttempts', form.maxAttempts || '0');
      // Clean questions before sending
      const cleanQ = form.questions.map(q => ({
        question: q.question,
        type: q.type,
        options: q.type === 'mcq' ? q.options : [],
        answer: q.type === 'short' ? null : q.answer,
        explanation: q.explanation || '',
        maxScore: q.type === 'short' ? (q.maxScore || 1) : 1,
      }));
      fd.append('questions', JSON.stringify(cleanQ));
      await api.createQuiz(fd);
      setView('list');
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const setQ = (i, k, v) => setForm(f => {
    const qs = [...f.questions];
    qs[i] = { ...qs[i], [k]: v };
    return { ...f, questions: qs };
  });

  const setOpt = (qi, oi, v) => setForm(f => {
    const qs = [...f.questions];
    const opts = [...qs[qi].options];
    opts[oi] = v;
    qs[qi] = { ...qs[qi], options: opts };
    return { ...f, questions: qs };
  });

  const addQuestion = (type) => {
    const q = type === 'truefalse'
      ? { question:'', type:'truefalse', options:[], answer:0, explanation:'', maxScore:1 }
      : type === 'short'
        ? { question:'', type:'short', options:[], answer:null, explanation:'', maxScore:1 }
        : { question:'', type:'mcq', options:['','','',''], answer:0, explanation:'', maxScore:1 };
    setForm(f => ({ ...f, questions: [...f.questions, q] }));
  };

  // ── Result screen ─────────────────────────────────────────────────────────
  if (view === 'result' && results) {
    const pct = results.percentage ?? 0;
    return (
      <div className="page">
        <div style={{ textAlign:'center', padding:'24px 0 20px' }}>
          <div style={{ fontSize:56 }}>{pct >= 70 ? '🎉' : '📖'}</div>
          <div style={{ fontSize:40, fontWeight:800, color: pct>=70 ? 'var(--success)' : 'var(--warning)', marginTop:8 }}>
            {results.score}/{results.total}
          </div>
          <div style={{ color:'var(--text2)', fontSize:15, marginTop:4 }}>{pct}% correct</div>
          {results.needsManual && <div style={{ fontSize:13, color:'var(--info)', marginTop:8 }}>⏳ Some answers need manual grading</div>}
        </div>
        {(active?.questions || []).map((q, i) => {
          const r = results.results?.[i];
          if (!r) return null;
          const qType = getType(q);
          return (
            <div key={i} className="card" style={{ marginBottom:10, borderLeft:`4px solid ${r.correct===null ? '#3B82F6' : r.correct ? 'var(--success)' : 'var(--danger)'}` }}>
              <div style={{ fontWeight:600, marginBottom:8 }}>{i+1}. {q.question}</div>
              {qType === 'short'
                ? <div style={{ fontSize:13, color:'var(--text2)' }}>Your answer: <em>{r.answer || '(no answer)'}</em><br/>⏳ Awaiting grading</div>
                : <>
                    <div style={{ fontSize:13, marginBottom:4 }}>
                      Your answer: <b>{qType === 'truefalse' ? (['True','False'][r.answer] ?? '—') : (q.options?.[r.answer] ?? '—')}</b> {r.correct ? '✅' : '❌'}
                    </div>
                    {!r.correct && (
                      <div style={{ fontSize:13, color:'var(--success)' }}>
                        Correct: {qType === 'truefalse' ? ['True','False'][r.correctAnswer] : q.options?.[r.correctAnswer]}
                      </div>
                    )}
                    {r.explanation && <div style={{ fontSize:12, fontStyle:'italic', color:'var(--text2)', marginTop:6 }}>💡 {r.explanation}</div>}
                  </>
              }
            </div>
          );
        })}
        <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', marginTop:8 }}
          onClick={() => { setView('list'); setActive(null); setResults(null); }}>
          ← Back to Quizzes
        </button>
      </div>
    );
  }

  // ── Taking quiz ───────────────────────────────────────────────────────────
  if (view === 'take' && active) {
    return (
      <div className="page">
        {/* Confirm dialog */}
        {confirm && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
            <div style={{ background:'var(--surface)', borderRadius:16, padding:24, width:'100%', maxWidth:380 }}>
              <div style={{ fontWeight:700, fontSize:17, marginBottom:8 }}>Submit Quiz?</div>
              <div style={{ color:'var(--text2)', fontSize:14, marginBottom:20 }}>You cannot change answers after submitting.</div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setConfirm(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={() => { setConfirm(false); submitAnswers(); }}>Submit</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:17, flex:1 }}>{active.title}</div>
          {active.timeLimit > 0 && (
            <div style={{ padding:'6px 16px', borderRadius:20, fontWeight:700, fontSize:15, background: timeLeft < 60 ? '#FEE2E2' : '#EEF2FF', color: timeLeft < 60 ? 'var(--danger)' : 'var(--primary)' }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Questions */}
        {active.questions.map((q, i) => {
          const qType = getType(q);
          const mcqOpts = getMCQOptions(q);
          return (
            <div key={i} className="card" style={{ marginBottom:12 }}>
              {q.imageUrl && <img src={q.imageUrl} alt="" style={{ width:'100%', borderRadius:8, marginBottom:10, maxHeight:200, objectFit:'cover' }} />}
              <div style={{ fontWeight:600, fontSize:15, marginBottom:12 }}>
                {i+1}. {q.question}
                {qType === 'short' && <span style={{ fontSize:11, color:'var(--text2)', marginLeft:6 }}>({q.maxScore || 1} pts)</span>}
              </div>

              {/* MCQ */}
              {qType === 'mcq' && mcqOpts.map(({ opt, idx }) => (
                <button key={idx} onClick={() => setAnswers(a => { const c = [...a]; c[i] = idx; return c; })}
                  style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:10, marginBottom:8,
                    border:`2px solid ${answers[i] === idx ? 'var(--primary)' : 'var(--border)'}`,
                    background: answers[i] === idx ? 'rgba(108,99,255,.1)' : 'var(--surface2)',
                    fontFamily:'inherit', fontSize:14, textAlign:'left', cursor:'pointer',
                    fontWeight: answers[i] === idx ? 600 : 400, color:'var(--text)',
                    transition:'all .15s' }}>
                  {opt}
                </button>
              ))}

              {/* True/False */}
              {qType === 'truefalse' && ['True','False'].map((opt, j) => (
                <button key={j} onClick={() => setAnswers(a => { const c = [...a]; c[i] = j; return c; })}
                  style={{ display:'inline-flex', padding:'10px 24px', borderRadius:10, marginRight:10, marginBottom:8,
                    border:`2px solid ${answers[i] === j ? 'var(--primary)' : 'var(--border)'}`,
                    background: answers[i] === j ? 'rgba(108,99,255,.1)' : 'var(--surface2)',
                    fontFamily:'inherit', fontSize:14, cursor:'pointer',
                    fontWeight: answers[i] === j ? 700 : 400, color:'var(--text)',
                    transition:'all .15s' }}>
                  {opt}
                </button>
              ))}

              {/* Short answer */}
              {qType === 'short' && (
                <textarea rows={3} placeholder="Type your answer here…"
                  value={answers[i] || ''}
                  onChange={e => setAnswers(a => { const c = [...a]; c[i] = e.target.value; return c; })}
                  style={{ width:'100%', padding:'12px', border:'1.5px solid var(--border)', borderRadius:10,
                    fontFamily:'inherit', fontSize:14, outline:'none', resize:'vertical',
                    background:'var(--surface2)', color:'var(--text)' }} />
              )}
            </div>
          );
        })}

        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15, marginTop:8 }}
          onClick={() => setConfirm(true)}>
          Submit Quiz
        </button>
      </div>
    );
  }

  // ── Submissions (admin) ───────────────────────────────────────────────────
  if (view === 'submissions') {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => { setView('list'); setActive(null); }} style={{ marginBottom:14 }}>← Back</button>
        <div style={{ fontWeight:700, fontSize:17, marginBottom:14 }}>Submissions: {active?.title}</div>
        {submissions.length === 0 && <div className="empty"><div className="empty-icon">📭</div><h3>No submissions yet</h3></div>}
        {submissions.map((s, i) => (
          <div key={i} className="card" style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ fontWeight:600 }}>{s.studentName || 'Student'}</div>
              <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                background: s.needsManualGrading ? '#FEF3C7' : '#D1FAE5',
                color: s.needsManualGrading ? '#92400E' : '#065F46' }}>
                {s.needsManualGrading ? '⚠️ Needs grading' : '✅ Auto graded'}
              </span>
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>
              {formatDate(s.submittedAt)} • {s.score}/{s.total} ({s.percentage}%)
            </div>
            {/* Show short answers for grading */}
            {s.needsManualGrading && (active?.questions || []).map((q, qi) => {
              if (getType(q) !== 'short') return null;
              const ans = s.rawAnswers?.[qi];
              const gradingKey = `${s._id}-${qi}`;
              return (
                <div key={qi} style={{ background:'var(--surface2)', borderRadius:8, padding:10, marginBottom:8 }}>
                  <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>Q{qi+1}: {q.question}</div>
                  <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8, fontStyle:'italic' }}>"{ans || '(no answer)'}"</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>Max score: {q.maxScore || 1}</div>
                  {grading === gradingKey
                    ? <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
                        <input type="number" min="0" max={q.maxScore || 1} placeholder="Score"
                          value={gradeScore} onChange={e => setGradeScore(e.target.value)}
                          style={{ width:80, padding:'6px 8px', border:'1px solid var(--border)', borderRadius:6, fontFamily:'inherit', outline:'none' }} />
                        <button className="btn btn-primary btn-sm" onClick={() => saveGrade(s._id, qi)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setGrading(null); setGradeScore(''); }}>Cancel</button>
                      </div>
                    : <button className="btn btn-ghost btn-sm" style={{ marginTop:8 }}
                        onClick={() => { setGrading(gradingKey); setGradeScore(''); }}>
                        ✏️ Grade this answer
                      </button>
                  }
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ── Add quiz form ─────────────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => { setView('list'); setError(''); }} style={{ marginBottom:14 }}>← Back</button>
        <div style={{ fontWeight:700, fontSize:17, marginBottom:16 }}>New Quiz</div>

        {error && <div style={{ padding:'10px 14px', background:'#FEE2E2', color:'var(--danger)', borderRadius:8, marginBottom:14, fontSize:13 }}>{error}</div>}

        <input style={S} placeholder="Quiz title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>Time limit (minutes, 0 = none)</div>
            <input style={{ ...S, marginBottom:0 }} type="number" min="0" placeholder="0" value={form.timeLimit} onChange={e => setForm(f => ({ ...f, timeLimit: e.target.value }))} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>Max attempts (0 = unlimited)</div>
            <input style={{ ...S, marginBottom:0 }} type="number" min="0" placeholder="0" value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: e.target.value }))} />
          </div>
        </div>

        <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Questions ({form.questions.length})</div>

        {form.questions.map((q, qi) => (
          <div key={qi} style={{ background:'var(--surface2)', borderRadius:12, padding:14, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontWeight:700, fontSize:13 }}>Question {qi+1} — {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'truefalse' ? 'True / False' : 'Short Answer'}</span>
              {form.questions.length > 1 && (
                <button onClick={() => setForm(f => ({ ...f, questions: f.questions.filter((_, x) => x !== qi) }))}
                  style={{ background:'#FEE2E2', border:'none', borderRadius:6, padding:'4px 10px', color:'var(--danger)', cursor:'pointer', fontWeight:600 }}>✕</button>
              )}
            </div>

            <textarea rows={2} style={{ ...S }} placeholder="Question text *" value={q.question} onChange={e => setQ(qi, 'question', e.target.value)} />

            {/* MCQ options */}
            {q.type === 'mcq' && (
              <>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>Options (select correct answer with radio button):</div>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                    <input type="radio" name={`correct-${qi}`} checked={q.answer === oi} onChange={() => setQ(qi, 'answer', oi)}
                      style={{ width:18, height:18, cursor:'pointer', flexShrink:0 }} />
                    <input style={{ ...S, flex:1, marginBottom:0 }} placeholder={`Option ${oi+1}`} value={opt} onChange={e => setOpt(qi, oi, e.target.value)} />
                  </div>
                ))}
                <div style={{ fontSize:11, color:'var(--text3)' }}>🔘 The selected radio = correct answer</div>
              </>
            )}

            {/* True/False */}
            {q.type === 'truefalse' && (
              <>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>Select the correct answer:</div>
                <div style={{ display:'flex', gap:10 }}>
                  {['True','False'].map((v, vi) => (
                    <button key={vi} onClick={() => setQ(qi, 'answer', vi)}
                      style={{ flex:1, padding:'10px', borderRadius:10,
                        border:`2px solid ${q.answer === vi ? 'var(--primary)' : 'var(--border)'}`,
                        background: q.answer === vi ? 'rgba(108,99,255,.1)' : 'var(--surface)',
                        cursor:'pointer', fontFamily:'inherit', fontWeight: q.answer === vi ? 700 : 400,
                        color:'var(--text)', fontSize:14 }}>
                      {v}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Short answer */}
            {q.type === 'short' && (
              <>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>Max score for this question:</div>
                <input type="number" min="1" style={{ ...S, width:120 }} placeholder="Max score" value={q.maxScore}
                  onChange={e => setQ(qi, 'maxScore', +e.target.value)} />
                <div style={{ fontSize:11, color:'var(--text3)' }}>Students type their answer. You grade it manually.</div>
              </>
            )}

            <input style={{ ...S, marginTop:10 }} placeholder="Explanation (optional, shown after submission)" value={q.explanation}
              onChange={e => setQ(qi, 'explanation', e.target.value)} />
          </div>
        ))}

        {/* Add question buttons */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => addQuestion('mcq')}>+ Multiple Choice</button>
          <button className="btn btn-ghost btn-sm" onClick={() => addQuestion('truefalse')}>+ True / False</button>
          <button className="btn btn-ghost btn-sm" onClick={() => addQuestion('short')}>+ Short Answer</button>
        </div>

        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:14, fontSize:15 }}
          onClick={saveQuiz} disabled={saving}>
          {saving ? 'Saving…' : 'Save Quiz'}
        </button>
      </div>
    );
  }

  // ── Quiz list ─────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>←</button>
        <div style={{ fontWeight:700, fontSize:17, flex:1 }}>❓ Quizzes</div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm"
            onClick={() => { setForm({ title:'', timeLimit:'0', maxAttempts:'0', questions:[{ question:'', type:'mcq', options:['','','',''], answer:0, explanation:'', maxScore:1 }] }); setError(''); setView('add'); }}>
            + Add
          </button>
        )}
      </div>
      {loading && <div className="spinner" />}
      {!loading && quizzes.length === 0 && <div className="empty"><div className="empty-icon">❓</div><h3>No quizzes yet</h3></div>}
      {quizzes.map(q => (
        <div key={q._id} className="card" style={{ marginBottom:10 }}>
          <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>{q.title}</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10 }}>
            {q.questions?.length || 0} questions
            {q.timeLimit > 0 ? ` • ⏱ ${Math.round(q.timeLimit/60)} min` : ' • No time limit'}
            {q.maxAttempts > 0 ? ` • Max ${q.maxAttempts} attempt(s)` : ''}
            {!isAdmin ? ` • My attempts: ${q.myAttempts || 0}` : ''}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {isAdmin ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => openSubmissions(q)}>📋 Submissions</button>
                <button className="btn btn-danger btn-sm" onClick={async () => { if (window.confirm('Delete this quiz?')) { await api.deleteQuiz(q._id); load(); } }}>Delete</button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm"
                onClick={() => startQuiz(q)}
                disabled={q.maxAttempts > 0 && q.myAttempts >= q.maxAttempts}>
                {q.maxAttempts > 0 && q.myAttempts >= q.maxAttempts ? 'Max attempts reached' : 'Start Quiz'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
