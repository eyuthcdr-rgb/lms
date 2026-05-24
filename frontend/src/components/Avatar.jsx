import React from 'react';
import { getInitials } from '../utils/helpers.js';
export default function Avatar({ src, name = '', size = 40, style = {} }) {
  const s = { width: size, height: size, fontSize: size * 0.35, ...style };
  if (src) return <img src={src} alt={name} className="avatar" style={s} />;
  return <div className="avatar-placeholder" style={s}>{getInitials(name)}</div>;
}
