import React, { useState } from 'react';

export default function PDFViewer({ url, title }) {
  const [viewer, setViewer] = useState('google');

  if (!url) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text2)' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
      <div>No file attached</div>
    </div>
  );

  // Cloudinary raw PDFs: URL already ends in .pdf, use directly
  // Google Docs viewer works best for PDFs
  const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div>
      {/* Action buttons - always visible */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <a href={url} target="_blank" rel="noreferrer"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, color: 'var(--text)', textDecoration: 'none' }}>
          🔗 Open PDF
        </a>
        <a href={url} download
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: 'linear-gradient(135deg,#6C63FF,#9B59B6)', borderRadius: 10, fontWeight: 600, fontSize: 14, color: '#fff', textDecoration: 'none' }}>
          ⬇️ Download
        </a>
      </div>

      {/* Viewer toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['google', 'direct'].map(v => (
          <button key={v} onClick={() => setViewer(v)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              background: viewer === v ? 'linear-gradient(135deg,#6C63FF,#9B59B6)' : 'var(--surface2)',
              color: viewer === v ? '#fff' : 'var(--text2)' }}>
            {v === 'google' ? '🌐 Google Viewer' : '📄 Direct View'}
          </button>
        ))}
      </div>

      {/* Iframe */}
      <iframe
        src={viewer === 'google' ? googleUrl : url}
        style={{ width: '100%', height: '72vh', border: 'none', borderRadius: 12, background: '#fff' }}
        title={title || 'PDF Document'}
      />

      <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', marginTop: 8 }}>
        If it doesn't load, tap "Open PDF" or "Download" above.
      </p>
    </div>
  );
}
