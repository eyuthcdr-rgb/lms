import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Sheet from '../components/Sheet.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { getYoutubeThumbnail, formatDate } from '../utils/helpers.js';

export default function VideosPage({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [viewing, setViewing]   = useState(null);
  const [editing, setEditing]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', description: '', url: '', duration: '', videoFile: null });
  const [saving, setSaving]     = useState(false);

  const load = () => api.getVideos(id).then(setVideos).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (!form.title || (!form.url && !form.videoFile && !editing)) return alert('Title and video source required.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('subject', id);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('duration', form.duration);
      if (form.url) fd.append('url', form.url);
      if (form.videoFile) fd.append('videoFile', form.videoFile);
      if (editing) await api.updateVideo(editing._id, fd);
      else await api.createVideo(fd);
      setShowForm(false); setEditing(null);
      setForm({ title: '', description: '', url: '', duration: '', videoFile: null });
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (vid) => {
    if (!confirm('Delete this video?')) return;
    await api.deleteVideo(vid);
    setVideos(v => v.filter(x => x._id !== vid));
  };

  const startEdit = (v) => {
    setEditing(v);
    setForm({ title: v.title, description: v.description || '', url: v.url || '', duration: v.duration || '', videoFile: null });
    setShowForm(true);
  };

  const openView = async (v) => {
    setViewing(v);
    if (!isAdmin) api.markVideoWatched(v._id).catch(() => {});
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(-1)}>←</button>
        <h1>🎬 Videos</h1>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ title:'', description:'', url:'', duration:'', videoFile:null }); setShowForm(true); }}>+ Add</button>}
      </div>

      {loading && <div className="spinner" />}
      {!loading && videos.length === 0 && <div className="empty"><div className="empty-icon">🎬</div><h3>No videos yet</h3></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {videos.map(v => {
          const thumb = v.thumbnail || getYoutubeThumbnail(v.url);
          return (
            <div key={v._id} className="card card-hover" onClick={() => openView(v)} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
              {/* Thumbnail */}
              <div style={{ position: 'relative', height: 180, background: 'var(--surface2)' }}>
                {thumb
                  ? <img src={thumb} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>🎬</div>
                }
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,0.9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>▶</div>
                </div>
                {v.duration && <div style={{ position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,0.8)', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:600 }}>{v.duration}</div>}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{v.title}</div>
                    {v.description && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{v.description.slice(0, 80)}{v.description.length > 80 ? '…' : ''}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{formatDate(v.createdAt)}</div>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => startEdit(v)}>✏️</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => del(v._id)}>🗑</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View sheet */}
      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title}>
        {viewing && (
          <>
            <VideoPlayer url={viewing.url || viewing.fileUrl} />
            {viewing.description && <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 14, lineHeight: 1.7 }}>{viewing.description}</p>}
          </>
        )}
      </Sheet>

      {/* Add/Edit sheet */}
      <Sheet open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Video' : 'Add Video'}>
        <label className="label">Title *</label>
        <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Video title" style={{ marginBottom: 12 }} />
        <label className="label">Description</label>
        <textarea className="input" value={form.description} rows={3} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description…" style={{ marginBottom: 12, resize: 'vertical' }} />
        <label className="label">YouTube URL</label>
        <input className="input" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." style={{ marginBottom: 12 }} />
        <div style={{ textAlign: 'center', margin: '8px 0', color: 'var(--text3)', fontSize: 13 }}>— or —</div>
        <label className="label">Upload Video from Device</label>
        <input type="file" accept="video/*" style={{ marginBottom: 12, color: 'var(--text2)', fontSize: 13 }} onChange={e => setForm(f => ({ ...f, videoFile: e.target.files[0] }))} />
        <label className="label">Duration (e.g. 12:34)</label>
        <input className="input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Optional" style={{ marginBottom: 16 }} />
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Video'}
        </button>
      </Sheet>
    </div>
  );
}
