import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatTime } from '../utils/helpers.js';

const S = { width:'100%',padding:'10px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none',background:'var(--surface2)',color:'var(--text)',marginBottom:10 };

function emptyQ() { return { question:'', type:'mcq', options:['','','',''], answer:0, explanation:'', maxScore:1, imageFile:null }; }

export default function QuizPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [view, setView]   = useState('list'); // list|add|take|result|submissions
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState(null);
  const [answers, setAnswers] = useState([]);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirm, setConfirm]  = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [gradingAttempt, setGradingAttempt] = useState(null);
  const [form, setForm] = useState({ title:'', timeLimit:'', maxAttempts:'', questions:[emptyQ()] });
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);
  const saveRef  = useRef(null);

  const load = () => api.getQuizzes(id).then(setQuizzes).finally(()=>setLoading(false));
  useEffect(()=>{ load(); }, [id]);
  useEffect(()=>()=>{ clearInterval(timerRef.current); clearInterval(saveRef.current); }, []);

  const startQuiz = async (quiz) => {
    const { quiz: full, attempt } = await api.getQuiz(quiz._id);
    setActive(full); setResults(null);
    const saved = attempt?.rawAnswers || new Array(full.questions.length).fill(null);
    const savedTime = attempt?.timeRemaining ?? (full.timeLimit || 0);
    setAnswers(saved);
    await api.startQuiz(full._id);
    if (full.timeLimit > 0) {
      setTimeLeft(savedTime);
      timerRef.current = setInterval(()=>setTimeLeft(t=>{ if(t<=1){ clearInterval(timerRef.current); doSubmit(full._id, saved, true); return 0; } return t-1; }),1000);
    }
    saveRef.current = setInterval(()=>{
      setAnswers(cur=>{ setTimeLeft(t=>{ api.saveQuiz(full._id, cur, t).catch(()=>{}); return t; }); return cur; });
    }, 20000);
    setView('take');
  };

  const doSubmit = async (qid, ans, auto=false) => {
    clearInterval(timerRef.current); clearInterval(saveRef.current);
    const finalAns = ans || answers;
    const res = await api.submitQuiz(qid || active._id, finalAns).catch(e=>({ error:e.message }));
    setResults(res); setView('result');
  };

  const handleSubmit = () => { setConfirm(true); };
  const confirmSubmit = () => { setConfirm(false); doSubmit(); };

  const openSubmissions = async (quiz) => {
    const atts = await api.getAllAttempts(quiz._id);
    setActive(quiz); setSubmissions(atts); setView('submissions');
  };

  const saveQuiz = async () => {
    if (!form.title) return alert('Title required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id);
      fd.append('title', form.title);
      fd.append('timeLimit', form.timeLimit || '0');
      fd.append('maxAttempts', form.maxAttempts || '0');
      const qs = form.questions.map(({imageFile,...q})=>q);
      fd.append('questions', JSON.stringify(qs));
      form.questions.forEach((q,i)=>{ if(q.imageFile) fd.append(`image_${i}`, q.imageFile); });
      await api.createQuiz(fd);
      setForm({ title:'', timeLimit:'', maxAttempts:'', questions:[emptyQ()] });
      setView('list'); load();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const setQ = (i, k, v) => setForm(f=>{ const qs=[...f.questions]; qs[i]={...qs[i],[k]:v}; return {...f,questions:qs}; });
  const setOpt = (qi, oi, v) => setForm(f=>{ const qs=[...f.questions]; const opts=[...qs[qi].options]; opts[oi]=v; qs[qi]={...qs[qi],options:opts}; return {...f,questions:qs}; });

  // ── Result screen ─────────────────────────────────────────────────────────
  if (view==='result' && results) {
    const pct = results.percentage ?? 0;
    return (
      <div className="page">
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:48}}>{pct>=70?'🎉':'📖'}</div>
          <div style={{fontSize:36,fontWeight:800,color:pct>=70?'var(--success)':'var(--warning)'}}>{results.score}/{results.total}</div>
          <div style={{color:'var(--text2)',fontSize:14}}>{pct}% • {results.needsManual?'Some answers need manual grading':'Auto graded'}</div>
        </div>
        {active?.questions?.map((q,i)=>{
          const r = results.results?.[i];
          if (!r) return null;
          return (
            <div key={i} className="card" style={{marginBottom:10,borderLeft:`4px solid ${r.correct===null?'var(--info)':r.correct?'var(--success)':'var(--danger)'}`}}>
              {q.imageUrl && <img src={q.imageUrl} alt="" style={{width:'100%',borderRadius:8,marginBottom:8,maxHeight:180,objectFit:'cover'}}/>}
              <div style={{fontWeight:600,marginBottom:8}}>{i+1}. {q.question}</div>
              {q.type==='short'
                ? <div style={{fontSize:13,color:'var(--text2)'}}>Your answer: <em>{r.answer||'(no answer)'}</em><br/>⏳ Awaiting manual grading</div>
                : <>
                  <div style={{fontSize:13}}>Your answer: <b>{q.type==='truefalse'?['True','False'][r.answer]:q.options?.[r.answer]||'—'}</b> {r.correct?'✅':'❌'}</div>
                  {!r.correct && <div style={{fontSize:13,color:'var(--success)',marginTop:4}}>Correct: {q.type==='truefalse'?['True','False'][r.correctAnswer]:q.options?.[r.correctAnswer]}</div>}
                  {r.explanation && <div style={{fontSize:12,fontStyle:'italic',color:'var(--text2)',marginTop:6}}>💡 {r.explanation}</div>}
                </>
              }
            </div>
          );
        })}
        <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',marginTop:8}} onClick={()=>{setView('list');setActive(null);setResults(null);}}>← Back to Quizzes</button>
      </div>
    );
  }

  // ── Taking quiz ───────────────────────────────────────────────────────────
  if (view==='take' && active) {
    return (
      <div className="page">
        {confirm && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{background:'var(--surface)',borderRadius:16,padding:24,width:'100%',maxWidth:360}}>
              <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Submit Quiz?</div>
              <div style={{color:'var(--text2)',fontSize:14,marginBottom:20}}>You cannot modify answers after submission.</div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setConfirm(false)}>Cancel</button>
                <button className="btn btn-primary" style={{flex:1}} onClick={confirmSubmit}>Submit</button>
              </div>
            </div>
          </div>
        )}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:16,flex:1}}>{active.title}</div>
          {active.timeLimit>0 && (
            <div style={{padding:'6px 14px',borderRadius:20,fontWeight:700,fontSize:15,background:timeLeft<60?'#FEE2E2':'#EEF2FF',color:timeLeft<60?'var(--danger)':'var(--accent)'}}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
        </div>
        {active.questions.map((q,i)=>(
          <div key={i} className="card" style={{marginBottom:12}}>
            {q.imageUrl && <img src={q.imageUrl} alt="" style={{width:'100%',borderRadius:8,marginBottom:10,maxHeight:200,objectFit:'cover'}}/>}
            <div style={{fontWeight:600,marginBottom:10}}>{i+1}. {q.question} {q.type==='short'&&<span style={{fontSize:11,color:'var(--text2)'}}>({q.maxScore} pts)</span>}</div>
            {q.type==='mcq' && (q.options||[]).map((opt,j)=>(
              <button key={j} onClick={()=>setAnswers(a=>{const c=[...a];c[i]=j;return c;})}
                style={{display:'block',width:'100%',padding:'10px 14px',borderRadius:8,border:`2px solid ${answers[i]===j?'var(--primary)':'var(--border)'}`,background:answers[i]===j?'#EEF2FF':'var(--surface)',fontFamily:'inherit',fontSize:14,textAlign:'left',cursor:'pointer',marginBottom:6,fontWeight:answers[i]===j?600:400,color:'var(--text)'}}>
                {opt}
              </button>
            ))}
            {q.type==='truefalse' && ['True','False'].map((opt,j)=>(
              <button key={j} onClick={()=>setAnswers(a=>{const c=[...a];c[i]=j;return c;})}
                style={{display:'inline-flex',padding:'8px 20px',borderRadius:8,border:`2px solid ${answers[i]===j?'var(--primary)':'var(--border)'}`,background:answers[i]===j?'#EEF2FF':'var(--surface)',fontFamily:'inherit',fontSize:14,cursor:'pointer',marginRight:8,fontWeight:answers[i]===j?600:400,color:'var(--text)'}}>
                {opt}
              </button>
            ))}
            {q.type==='short' && (
              <textarea rows={3} placeholder="Type your answer…" value={answers[i]||''}
                onChange={e=>setAnswers(a=>{const c=[...a];c[i]=e.target.value;return c;})}
                style={{width:'100%',padding:'10px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'inherit',fontSize:14,outline:'none',resize:'vertical',background:'var(--surface2)',color:'var(--text)'}}/>
            )}
          </div>
        ))}
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:14,fontSize:15}} onClick={handleSubmit}>
          Submit Quiz
        </button>
      </div>
    );
  }

  // ── Submissions list (admin) ───────────────────────────────────────────────
  if (view==='submissions') {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={()=>{setView('list');setActive(null);}} style={{marginBottom:16}}>← Back</button>
        <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>Submissions: {active?.title}</div>
        {submissions.length===0 && <div className="empty"><div className="empty-icon">📭</div><h3>No submissions yet</h3></div>}
        {submissions.map((s,i)=>(
          <div key={i} className="card" style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <div style={{fontWeight:600}}>{s.studentName}</div>
              <span style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:s.needsManualGrading?'#FEF3C7':'#D1FAE5',color:s.needsManualGrading?'#92400E':'#065F46'}}>
                {s.needsManualGrading?'Needs grading':'Auto graded'}
              </span>
            </div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:6}}>{formatDate(s.submittedAt)} • Score: {s.score}/{s.total} ({s.percentage}%)</div>
            {s.needsManualGrading && (
              <div>
                {active?.questions?.map((q,qi)=> q.type==='short' && (
                  <div key={qi} style={{background:'var(--surface2)',borderRadius:8,padding:10,marginBottom:8}}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>Q{qi+1}: {q.question}</div>
                    <div style={{fontSize:13,marginBottom:8}}>Answer: <em>{s.rawAnswers?.[qi]||'—'}</em></div>
                    {gradingAttempt===`${s._id}-${qi}`
                      ? <GradeInput onSave={async(score,qi)=>{ await api.gradeQuizAnswer(active._id, s._id, {questionIndex:qi,score}); setGradingAttempt(null); const atts=await api.getAllAttempts(active._id); setSubmissions(atts); }} questionIndex={qi} onCancel={()=>setGradingAttempt(null)} />
                      : <button className="btn btn-ghost btn-sm" onClick={()=>setGradingAttempt(`${s._id}-${qi}`)}>Grade this answer</button>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Add quiz form ─────────────────────────────────────────────────────────
  if (view==='add') {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={()=>setView('list')} style={{marginBottom:14}}>← Back</button>
        <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>New Quiz</div>
        <input style={S} placeholder="Quiz title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          <input style={{...S,flex:1,marginBottom:0}} placeholder="Time limit (mins, 0=none)" type="number" min="0" value={form.timeLimit} onChange={e=>setForm(f=>({...f,timeLimit:e.target.value}))}/>
          <input style={{...S,flex:1,marginBottom:0}} placeholder="Max attempts (0=unlimited)" type="number" min="0" value={form.maxAttempts} onChange={e=>setForm(f=>({...f,maxAttempts:e.target.value}))}/>
        </div>
        <div style={{marginBottom:6,marginTop:6,fontWeight:600,fontSize:13}}>Questions</div>
        {form.questions.map((q,qi)=>(
          <div key={qi} style={{background:'var(--surface2)',borderRadius:12,padding:12,marginBottom:10}}>
            <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
              <div style={{fontWeight:600,fontSize:13,flex:1}}>Q{qi+1}</div>
              <select value={q.type} onChange={e=>setQ(qi,'type',e.target.value)} style={{...S,width:'auto',marginBottom:0,padding:'6px 10px'}}>
                <option value="mcq">Multiple Choice</option>
                <option value="truefalse">True / False</option>
                <option value="short">Short Answer</option>
              </select>
              {form.questions.length>1 && <button onClick={()=>setForm(f=>({...f,questions:f.questions.filter((_,x)=>x!==qi)}))} style={{background:'#FEE2E2',border:'none',borderRadius:6,padding:'4px 8px',color:'var(--danger)',cursor:'pointer'}}>✕</button>}
            </div>
            <textarea rows={2} style={{...S}} placeholder="Question text" value={q.question} onChange={e=>setQ(qi,'question',e.target.value)}/>
            <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:8}}>
              Image (optional): <input type="file" accept="image/*" onChange={e=>setQ(qi,'imageFile',e.target.files[0])} style={{marginLeft:6}}/>
            </label>
            {q.type==='mcq' && <>
              {q.options.map((opt,oi)=>(
                <div key={oi} style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                  <input type="radio" name={`correct-${qi}`} checked={q.answer===oi} onChange={()=>setQ(qi,'answer',oi)}/>
                  <input style={{...S,flex:1,marginBottom:0}} placeholder={`Option ${oi+1}`} value={opt} onChange={e=>setOpt(qi,oi,e.target.value)}/>
                </div>
              ))}
              <div style={{fontSize:11,color:'var(--text2)',marginBottom:8}}>Select radio = correct answer</div>
            </>}
            {q.type==='truefalse' && (
              <div style={{display:'flex',gap:10,marginBottom:8}}>
                {['True','False'].map((v,vi)=>(
                  <button key={vi} onClick={()=>setQ(qi,'answer',vi)} style={{flex:1,padding:'8px',borderRadius:8,border:`2px solid ${q.answer===vi?'var(--primary)':'var(--border)'}`,background:q.answer===vi?'#EEF2FF':'var(--surface)',cursor:'pointer',fontWeight:q.answer===vi?700:400,fontFamily:'inherit'}}>
                    {v}
                  </button>
                ))}
              </div>
            )}
            {q.type==='short' && (
              <input style={S} type="number" min="1" placeholder="Max score for this question" value={q.maxScore} onChange={e=>setQ(qi,'maxScore',+e.target.value)}/>
            )}
            <input style={S} placeholder="Explanation (optional)" value={q.explanation} onChange={e=>setQ(qi,'explanation',e.target.value)}/>
          </div>
        ))}
        <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',marginBottom:10}} onClick={()=>setForm(f=>({...f,questions:[...f.questions,emptyQ()]}))}>+ Add Question</button>
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={saveQuiz} disabled={saving}>{saving?'Saving…':'Save Quiz'}</button>
      </div>
    );
  }

  // ── Quiz list ─────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(-1)}>←</button>
        <div style={{fontWeight:700,fontSize:17,flex:1}}>❓ Quizzes</div>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={()=>setView('add')}>+ Add</button>}
      </div>
      {loading && <div className="spinner"/>}
      {!loading && quizzes.length===0 && <div className="empty"><div className="empty-icon">❓</div><h3>No quizzes yet</h3></div>}
      {quizzes.map(q=>(
        <div key={q._id} className="card" style={{marginBottom:10}}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:4}}>{q.title}</div>
          <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>
            {q.questions?.length||0} questions
            {q.timeLimit>0?` • ⏱ ${Math.round(q.timeLimit/60)} min`:''}
            {q.maxAttempts>0?` • Max ${q.maxAttempts} attempt(s)`:''}
            {!isAdmin?` • My attempts: ${q.myAttempts||0}`:''}
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {isAdmin
              ? <>
                  <button className="btn btn-ghost btn-sm" onClick={()=>openSubmissions(q)}>📋 Submissions</button>
                  <button className="btn btn-danger btn-sm" onClick={async()=>{ if(confirm('Delete?')){ await api.deleteQuiz(q._id); load(); }}}>Delete</button>
                </>
              : <button className="btn btn-primary btn-sm" onClick={()=>startQuiz(q)} disabled={q.maxAttempts>0&&q.myAttempts>=q.maxAttempts}>
                  {q.maxAttempts>0&&q.myAttempts>=q.maxAttempts?'Max attempts reached':'Start Quiz'}
                </button>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

function GradeInput({ onSave, onCancel, questionIndex }) {
  const [score, setScore] = useState('');
  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <input type="number" min="0" placeholder="Score" value={score} onChange={e=>setScore(e.target.value)}
        style={{width:80,padding:'6px 8px',border:'1px solid var(--border)',borderRadius:6,fontFamily:'inherit',outline:'none'}}/>
      <button className="btn btn-primary btn-sm" onClick={()=>onSave(+score, questionIndex)} disabled={score===''}>Save</button>
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}
