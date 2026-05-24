import React, { useState } from 'react';

export default function PDFViewer({ url, title }) {
  const [method, setMethod] = useState('google'); // google | direct | download

  if (!url) return (
    <div className="empty">
      <div className="empty-icon">📄</div>
      <h3>No PDF attached</h3>
    </div>
  );

  // Cloudinary PDFs: convert to direct viewable URL
  // Replace /raw/upload/ with /image/upload/ and add .pdf
  const viewUrl = url.includes('cloudinary.com')
    ? url.replace('/raw/upload/', '/image/upload/').replace('/upload/', '/upload/fl_attachment/')
    : url;

  // Google Docs viewer URL
  const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <a href={url} target="_blank" rel="noreferrer"
          className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          🔗 Open PDF
        </a>
        <a href={url} download={title || 'document.pdf'}
          className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          ⬇️ Download
        </a>
      </div>

      {/* Viewer toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['google', 'direct'].map(m => (
          <button key={m} onClick={() => setMethod(m)}
            className={`btn btn-sm ${method === m ? 'btn-primary' : 'btn-ghost'}`}>
            {m === 'google' ? 'Google Viewer' : 'Direct View'}
          </button>
        ))}
      </div>

      {/* PDF display */}
      {method === 'google' && (
        <iframe
          src={googleUrl}
          style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 12 }}
          title={title || 'PDF'}
        />
      )}

      {method === 'direct' && (
        <iframe
          src={url}
          style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 12 }}
          title={title || 'PDF'}
        />
      )}

      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, textAlign: 'center' }}>
        If the viewer doesn't load, tap "Open PDF" to view in browser or "Download" to save it.
      </p>
    </div>
  );
}
