import React, { useState } from 'react';

export default function PDFViewer({ url, title }) {
  const [viewer, setViewer] = useState('google');
  if (!url) return <div style={{textAlign:'center',padding:32,color:'var(--text2)'}}>📄 No file attached</div>;

  // Force Cloudinary PDFs to use raw delivery (fl_attachment for download)
  const downloadUrl = url.includes('cloudinary.com')
    ? url.replace('/upload/', '/upload/fl_attachment/')
    : url;

  const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <a href={url} target="_blank" rel="noreferrer"
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            padding:'10px', background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:10, fontWeight:600, fontSize:13, color:'var(--text)', textDecoration:'none', minWidth:120 }}>
          🔗 Open PDF
        </a>
        <a href={downloadUrl} download={title || 'document.pdf'}
          onClick={e => {
            // Fallback: if download attribute doesn't work, force via fetch
            e.preventDefault();
            fetch(downloadUrl)
              .then(r => r.blob())
              .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = title || 'document.pdf';
                link.click();
              })
              .catch(() => window.open(downloadUrl, '_blank'));
          }}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            padding:'10px', background:'linear-gradient(135deg,#6C63FF,#9B59B6)',
            borderRadius:10, fontWeight:600, fontSize:13, color:'#fff', textDecoration:'none', cursor:'pointer', minWidth:120 }}>
          ⬇️ Download
        </a>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        {['google','direct'].map(v => (
          <button key={v} onClick={() => setViewer(v)}
            style={{ flex:1, padding:'7px', borderRadius:8, border:'1px solid var(--border)',
              fontFamily:'inherit', fontWeight:600, fontSize:12, cursor:'pointer',
              background: viewer===v ? 'linear-gradient(135deg,#6C63FF,#9B59B6)' : 'var(--surface2)',
              color: viewer===v ? '#fff' : 'var(--text2)' }}>
            {v==='google' ? '🌐 Google Viewer' : '📄 Direct View'}
          </button>
        ))}
      </div>
      <iframe src={viewer==='google' ? googleUrl : url}
        style={{ width:'100%', height:'70vh', border:'none', borderRadius:12, background:'#fff' }}
        title={title || 'PDF'} />
      <p style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:6 }}>
        If viewer fails, use "Open PDF" or "Download" above.
      </p>
    </div>
  );
}
