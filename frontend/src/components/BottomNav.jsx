import React from 'react';
import { NavLink } from 'react-router-dom';

export default function BottomNav({ isAdmin }) {
  const item = (to, icon, label) => (
    <NavLink to={to} end style={({ isActive }) => ({
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: '.02em',
      color: isActive ? 'var(--primary)' : 'var(--text3)',
      transition: 'color .15s', textDecoration: 'none',
    })}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      {label}
    </NavLink>
  );

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'var(--nav-h)',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 20px rgba(0,0,0,.06)',
    }}>
      {item('/', '🏠', 'Home')}
      {item('/dashboard', '📊', 'Stats')}
      {item('/profile', '👤', 'Profile')}
      {isAdmin && item('/admin', '⚙️', 'Admin')}
    </nav>
  );
}
