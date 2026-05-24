import React, { useEffect } from 'react';
export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
