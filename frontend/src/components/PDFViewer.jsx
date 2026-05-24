import React from 'react';
export default function PDFViewer({ url, title }) {
  if (!url) return <div className="empty"><div className="empty-icon">📄</div><h3>No PDF attached</h3></div>;
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          🔗 Open in Browser
        </a>
        <a href={url} download={title || 'document.pdf'} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          ⬇ Download PDF
        </a>
      </div>
      <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
        className="pdf-viewer" title={title || 'PDF'} />
    </div>
  );
}
