import React from 'react';
export default function StatCard({ icon, label, value, color, grad, onClick, sub }) {
  return (
    <div onClick={onClick} className="grad-card" style={{
      background: grad || 'var(--surface)',
      border: grad ? 'none' : '1px solid var(--border)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform .15s',
    }}
    onMouseDown={e => onClick && (e.currentTarget.style.transform = 'scale(.97)')}
    onMouseUp={e => onClick && (e.currentTarget.style.transform = 'scale(1)')}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: grad ? 'rgba(255,255,255,0.75)' : 'var(--text2)', marginTop: 6, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: grad ? 'rgba(255,255,255,0.6)' : 'var(--text3)', marginTop: 3 }}>{sub}</div>}
      {onClick && <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 16, opacity: .6 }}>→</div>}
    </div>
  );
}
