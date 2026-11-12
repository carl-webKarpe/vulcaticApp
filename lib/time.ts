const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now", "5m ago", "3h ago", "2d ago", then "Nov 3" (or "Nov 3, 2025" for older years). */
export function timeAgo(iso: string) {
  const date = new Date(iso);
  const s = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${MONTHS[date.getMonth()]} ${date.getDate()}${sameYear ? '' : `, ${date.getFullYear()}`}`;
}
