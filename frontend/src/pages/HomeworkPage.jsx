import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import PDFViewer from '../components/PDFViewer.jsx';
import { formatDate, isOverdue, timeUntil } from '../utils/helpers.js';

const S = { width:'100%',padding:'10px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none',background:'var(--surface2)',color:'var(--text)',marginBottom:10 };
const emptyQ = () => ({ question:'', type:'mcq', options:['','','',''], answer:0, maxScore:1 });

export default function HomeworkPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [view, setView]       = useState('list');
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [subForm, setSubForm] = useState({ note:'', file:null, answers:[] });
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [grading, setGrading] = useState(null);
  const [gradeData, setGradeData] = useState({ grade:'', adminFeedback:'' });
  const [form, setForm] = useState({ title:'', description:'', dueDate:'', homeworkType:'upload', questions:[emptyQ()], file:null });
  const [saving, setSaving] = useState(false);

  const load = () => api.getHomework(id).then(setHomework).finally(()=>setLoading(false));
  useEffect(()=>{ load(); },[id]);

  const openHW = async(hw) => {
    const { homework: full, mySubmission } = await api.getHomeworkItem(hw._id);
    setSelected({...full, mySubmission});
    setSubForm({ note:'', file:null, answers: full.questions ? new Array(full.questions.length).fill(null) : [] });
    if (isAdmin) { const subs = await api.getSubmissions(hw._id); setSubmissions(subs); }
    setView('detail');
  };

  const openSubmissionsView = async(hw) => {
    const subs = await api.getSubmissions(hw._id);
    setSelected(hw); setSubmissions(subs); setView('submissions');
  };

  const submitHW = async() => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (selected.homeworkType === 'interactive') {
        fd.append('answers', JSON.stringify(subForm.answers));
      } else {
        if (subForm.file) fd.append('file', subForm.file);
        fd.append('note', subForm.note || '');
      }
      await api.submitHomework(selected._id, fd);
      const { homework: full, mySubmission } = await api.getHomeworkItem(selected._id);
      setSelected({...full, mySubmission});
      setConfirm(false);
    } catch(e){ alert(e.message); } finally{ setSubmitting(false); }
  };

  const saveHW = async() => {
    if (!form.title) return alert('Title required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('homeworkType', form.homeworkType);
      if (form.dueDate) fd.append('dueDate', form.dueDate);
      if (form.homeworkType === 'interactive') fd.append('questions', JSON.stringify(form.questions));
      if (form.file) fd.append('file', form.file);
      await api.createHomework(fd);
      setForm({ title:'', description:'', dueDate:'', homeworkType:'upload', questions:[emptyQ()], file:null });
      setView('list'); load();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const doGrade = async(subId) => {
    await api.gradeSubmission(subId, { ...gradeData, status:'graded' });
    const subs = await api.getSubmissions(selected._id);
    setSubmissions(subs); setGrading(null);
  };

  const setQ = (i,k,v) => setForm(f=>{ const qs=[...f.questions]; qs[i]={...qs[i],[k]:v}; return {...f,questions:qs}; });
  const setOpt = (qi,oi,v) => setForm(f=>{ const qs=[...f.questions]; const opts=[...qs[qi].options]; opts[oi]=v; qs[qi]={...qs[qi],options:opts}; return {...f,questions:qs}; });
  const setAns = (i,v) => setSubForm(f=>{ const a=[...f.answers]; a[i]=v; return {...f,answers:a}; });

  // ── Submissions view ──────────────────────────────────────────────────────
  if (view==='submissions') return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={()=>setView('list')} style={{marginBottom:14}}>← Back</button>
      <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>Submissions: {selected?.title}</div>
      {submissions.length===0 && <div className="empty"><div className="empty-icon">📭</div><h3>No submissions yet</h3></div>}
      {submissions.map((s,i)=>(
        <div key={i} className="card" style={{marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <div style={{fontWeight:600}}>{s.studentName}</div>
            <span style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:s.status==='graded'?'#D1FAE5':'#FEF3C7',color:s.status==='graded'?'#065F46':'#92400E'}}>{s.status}</span>
          </div>
          <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>{formatDate(s.submittedAt)}</div>
          {s.fileUrl && <a href={s.fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{marginBottom:8,display:'inline-flex'}}>View file</a>}
          {s.note && <div style={{fontSize:13,marginBottom:8}}>Note: {s.note}</div>}
          {s.autoTotal>0 && <div style={{fontSize:13,marginBottom:8}}>Auto score: {s.autoScore}/{s.autoTotal}</div>}
          {s.answers?.filter(a=>{ const q=selected?.questions?.[a.questionIndex]; return q?.type==='short'; }).map((a,ai)=>(
            <div key={ai} style={{background:'var(--surface2)',borderRadius:8,padding:10,marginBottom:8}}>
              <div style={{fontWeight:600,fontSize:13}}>Q{a.questionIndex+1} (short answer):</div>
              <div style={{fontSize:13,margin:'4px 0'}}>{a.answer||'—'}</div>
            </div>
          ))}
          {s.status!=='graded'
            ? grading===s._id
              ? <div style={{marginTop:8}}>
                  <input style={S} placeholder="Grade (e.g. A, 90/100)" value={gradeData.grade} onChange={e=>setGradeData(g=>({...g,grade:e.target.value}))}/>
                  <textarea rows={2} style={{...S}} placeholder="Feedback (optional)" value={gradeData.adminFeedback} onChange={e=>setGradeData(g=>({...g,adminFeedback:e.target.value}))}/>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-primary btn-sm" onClick={()=>doGrade(s._id)}>Save Grade</button>
                    <button className="btn btn-ghost btn-sm" onClick={()=>setGrading(null)}>Cancel</button>
                  </div>
                </div>
              : <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>{ setGrading(s._id); setGradeData({grade:'',adminFeedback:''}); }}>✏️ Grade</button>
            : <div style={{marginTop:8,background:'var(--surface2)',borderRadius:8,padding:10}}>
                <div style={{fontWeight:600}}>Grade: {s.grade}</div>
                {s.adminFeedback && <div style={{fontSize:13,marginTop:4}}>{s.adminFeedback}</div>}
              </div>
          }
        </div>
      ))}
    </div>
  );

  // ── Homework detail ───────────────────────────────────────────────────────
  if (view==='detail' && selected) return (
    <div className="page">
      {confirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--surface)',borderRadius:16,padding:24,width:'100%',maxWidth:360}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Submit Homework?</div>
            <div style={{color:'var(--text2)',fontSize:14,marginBottom:20}}>You cannot change your submission after submitting.</div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={submitHW} disabled={submitting}>{submitting?'Submitting…':'Submit'}</button>
            </div>
          </div>
        </div>
      )}
      <button className="btn btn-ghost btn-sm" onClick={()=>setView('list')} style={{marginBottom:14}}>← Back</button>
      <div style={{fontWeight:700,fontSize:18,marginBottom:6}}>{selected.title}</div>
      {selected.description && <div style={{color:'var(--text2)',fontSize:14,marginBottom:10}}>{selected.description}</div>}
      {selected.dueDate && (
        <div style={{marginBottom:12,display:'inline-block',padding:'3px 12px',borderRadius:20,fontSize:12,fontWeight:600,background:isOverdue(selected.dueDate)?'#FEE2E2':'#EEF2FF',color:isOverdue(selected.dueDate)?'var(--danger)':'var(--primary)'}}>
          📅 {isOverdue(selected.dueDate)?'Overdue':'Due'}: {new Date(selected.dueDate).toLocaleDateString()} ({timeUntil(selected.dueDate)})
        </div>
      )}
      {selected.fileUrl && <PDFViewer url={selected.fileUrl} title={selected.title}/>}

      {/* Student submission */}
      {!isAdmin && (
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:12}}>Your Submission</div>
          {selected.mySubmission
            ? <>
                <div style={{display:'inline-block',padding:'3px 12px',borderRadius:20,fontSize:12,fontWeight:600,background:selected.mySubmission.status==='graded'?'#D1FAE5':'#FEF3C7',color:selected.mySubmission.status==='graded'?'#065F46':'#92400E',marginBottom:10}}>
                  {selected.mySubmission.status==='graded'?'✅ Graded':'⏳ Awaiting grade'}
                </div>
                {selected.mySubmission.fileUrl && <a href={selected.mySubmission.fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{display:'block',marginBottom:8}}>View your file</a>}
                {selected.mySubmission.status==='graded' && (
                  <div style={{background:'var(--surface2)',borderRadius:10,padding:12}}>
                    <div style={{fontWeight:600}}>Grade: {selected.mySubmission.grade}</div>
                    {selected.mySubmission.adminFeedback && <div style={{fontSize:13,marginTop:4}}>{selected.mySubmission.adminFeedback}</div>}
                  </div>
                )}
              </>
            : selected.homeworkType==='interactive'
              ? <>
                  {selected.questions?.map((q,i)=>{
                    const qType = q.type || (q.options?.length > 0 ? 'mcq' : 'short');
                    return (
                    <div key={i} style={{background:'var(--surface2)',borderRadius:10,padding:12,marginBottom:10}}>
                      <div style={{fontWeight:600,marginBottom:8}}>{i+1}. {q.question} {qType==='short'&&<span style={{fontSize:11,color:'var(--text2)'}}>({q.maxScore||1} pts)</span>}</div>
                      {qType==='mcq' && (q.options||[]).map((opt,oi)=>(
                        <button key={oi} onClick={()=>setAns(i,oi)} style={{display:'block',width:'100%',padding:'8px 12px',borderRadius:8,border:`2px solid ${subForm.answers[i]===oi?'var(--primary)':'var(--border)'}`,background:subForm.answers[i]===oi?'#EEF2FF':'var(--surface)',fontFamily:'inherit',fontSize:13,textAlign:'left',cursor:'pointer',marginBottom:4}}>
                          {opt}
                        </button>
                      ))}
                      {qType==='truefalse' && ['True','False'].map((v,vi)=>(
                        <button key={vi} onClick={()=>setAns(i,vi)} style={{padding:'6px 16px',borderRadius:8,border:`2px solid ${subForm.answers[i]===vi?'var(--primary)':'var(--border)'}`,background:subForm.answers[i]===vi?'#EEF2FF':'var(--surface)',cursor:'pointer',marginRight:8,fontFamily:'inherit'}}>
                          {v}
                        </button>
                      ))}
                      {qType==='short' && (
                        <textarea rows={3} placeholder="Your answer…" value={subForm.answers[i]||''} onChange={e=>setAns(i,e.target.value)}
                          style={{width:'100%',padding:'8px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'inherit',fontSize:13,outline:'none',resize:'vertical',background:'var(--surface)',color:'var(--text)'}}/>
                      )}
                    </div>
                    );
                  })}
                  <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>setConfirm(true)}>Submit Homework</button>
                </>
              : <>
                  <textarea rows={3} style={S} placeholder="Add a note (optional)" value={subForm.note} onChange={e=>setSubForm(f=>({...f,note:e.target.value}))}/>
                  <label style={{fontSize:13,color:'var(--text2)',display:'block',marginBottom:12}}>
                    Attach file (PDF or image):
                    <input type="file" accept=".pdf,image/*" style={{display:'block',marginTop:4}} onChange={e=>setSubForm(f=>({...f,file:e.target.files[0]}))}/>
                  </label>
                  <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>setConfirm(true)}>Submit Homework</button>
                </>
          }
        </div>
      )}
    </div>
  );

  // ── Add form ──────────────────────────────────────────────────────────────
  if (view==='add') return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={()=>setView('list')} style={{marginBottom:14}}>← Back</button>
      <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>New Assignment</div>
      <input style={S} placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
      <textarea rows={2} style={{...S}} placeholder="Description (optional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
      <input type="date" style={S} value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {['upload','interactive'].map(t=>(
          <button key={t} onClick={()=>setForm(f=>({...f,homeworkType:t}))} style={{flex:1,padding:'10px',borderRadius:8,border:`2px solid ${form.homeworkType===t?'var(--primary)':'var(--border)'}`,background:form.homeworkType===t?'#EEF2FF':'var(--surface)',cursor:'pointer',fontFamily:'inherit',fontWeight:form.homeworkType===t?700:400}}>
            {t==='upload'?'📎 Upload':'📝 Questions'}
          </button>
        ))}
      </div>
      {form.homeworkType==='upload'
        ? <label style={{fontSize:13,color:'var(--text2)',display:'block',marginBottom:12}}>
            Attach file (optional):
            <input type="file" accept=".pdf,image/*" style={{display:'block',marginTop:4}} onChange={e=>setForm(f=>({...f,file:e.target.files[0]}))}/>
          </label>
        : <>
            {form.questions.map((q,qi)=>(
              <div key={qi} style={{background:'var(--surface2)',borderRadius:12,padding:12,marginBottom:10}}>
                <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                  <div style={{fontWeight:600,fontSize:13,flex:1}}>Q{qi+1}</div>
                  <select value={q.type} onChange={e=>setQ(qi,'type',e.target.value)} style={{...S,width:'auto',marginBottom:0,padding:'5px 8px'}}>
                    <option value="mcq">MCQ</option>
                    <option value="truefalse">True/False</option>
                    <option value="short">Short Answer</option>
                  </select>
                  {form.questions.length>1 && <button onClick={()=>setForm(f=>({...f,questions:f.questions.filter((_,x)=>x!==qi)}))} style={{background:'#FEE2E2',border:'none',borderRadius:6,padding:'4px 8px',color:'var(--danger)',cursor:'pointer'}}>✕</button>}
                </div>
                <input style={S} placeholder="Question" value={q.question} onChange={e=>setQ(qi,'question',e.target.value)}/>
                {q.type==='mcq' && q.options.map((opt,oi)=>(
                  <div key={oi} style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                    <input type="radio" name={`hw-${qi}`} checked={q.answer===oi} onChange={()=>setQ(qi,'answer',oi)}/>
                    <input style={{...S,flex:1,marginBottom:0}} placeholder={`Option ${oi+1}`} value={opt} onChange={e=>setOpt(qi,oi,e.target.value)}/>
                  </div>
                ))}
                {q.type==='truefalse' && (
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    {['True','False'].map((v,vi)=>(
                      <button key={vi} onClick={()=>setQ(qi,'answer',vi)} style={{flex:1,padding:'8px',borderRadius:8,border:`2px solid ${q.answer===vi?'var(--primary)':'var(--border)'}`,background:q.answer===vi?'#EEF2FF':'var(--surface)',cursor:'pointer',fontFamily:'inherit',fontWeight:q.answer===vi?700:400}}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                {q.type==='short' && <input type="number" min="1" style={S} placeholder="Max score" value={q.maxScore} onChange={e=>setQ(qi,'maxScore',+e.target.value)}/>}
              </div>
            ))}
            <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',marginBottom:10}} onClick={()=>setForm(f=>({...f,questions:[...f.questions,emptyQ()]}))}>+ Add Question</button>
          </>
      }
      <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={saveHW} disabled={saving}>{saving?'Saving…':'Post Assignment'}</button>
    </div>
  );

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(-1)}>←</button>
        <div style={{fontWeight:700,fontSize:17,flex:1}}>📋 Homework</div>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={()=>setView('add')}>+ Add</button>}
      </div>
      {loading && <div className="spinner"/>}
      {!loading && homework.length===0 && <div className="empty"><div className="empty-icon">📋</div><h3>No assignments yet</h3></div>}
      {homework.map(hw=>(
        <div key={hw._id} className="card" style={{marginBottom:10}}>
          <div style={{fontWeight:600,marginBottom:4}}>{hw.title}</div>
          {hw.description && <div style={{fontSize:13,color:'var(--text2)',marginBottom:6}}>{hw.description.slice(0,80)}</div>}
          {hw.dueDate && (
            <div style={{marginBottom:8,display:'inline-block',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:isOverdue(hw.dueDate)?'#FEE2E2':'#EEF2FF',color:isOverdue(hw.dueDate)?'var(--danger)':'var(--primary)'}}>
              {isOverdue(hw.dueDate)?'⚠️ Overdue':'📅'} {new Date(hw.dueDate).toLocaleDateString()}
            </div>
          )}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>openHW(hw)}>Open</button>
            {isAdmin && <button className="btn btn-ghost btn-sm" onClick={()=>openSubmissionsView(hw)}>📋 Submissions</button>}
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={async()=>{ if(window.confirm('Delete?')){ await api.deleteHomework(hw._id); load(); }}}>Delete</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
