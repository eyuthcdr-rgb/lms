export const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0;

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function isOverdue(date) {
  return date && new Date(date) < new Date();
}

export function timeUntil(date) {
  if (!date) return '';
  const diff = new Date(date) - new Date();
  if (diff < 0) return 'Overdue';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return 'Due soon';
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getYoutubeThumbnail(url) {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : '';
}

export function getYoutubeEmbed(url) {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export function getDaysLeft(date) {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function scoreColor(p) {
  if (p >= 80) return 'var(--success)';
  if (p >= 60) return 'var(--warning)';
  return 'var(--danger)';
}
