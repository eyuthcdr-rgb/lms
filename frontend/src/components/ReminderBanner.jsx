import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, getDaysLeft } from '../utils/helpers.js';
export default function ReminderBanner() {
  const [reminders, setReminders] = useState([]);
  useEffect(() => { api.getReminders().then(setReminders).catch(() => {}); }, []);
  if (!reminders.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {reminders.map((r, i) => {
        const days = getDaysLeft(r.dueDate);
        const urgent = days !== null && days <= 2;
        return (
          <div key={i} className={`notif ${urgent ? 'notif-warning' : 'notif-info'}`}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{urgent ? '⚠️' : r.icon || '📌'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</div>
              <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>{r.message}</div>
              {r.dueDate && <div style={{ fontSize: 11, marginTop: 2 }}>Due: {formatDate(r.dueDate)} {days !== null ? `(${days > 0 ? `${days}d left` : 'Overdue!'})` : ''}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
