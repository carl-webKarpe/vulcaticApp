import type { Job } from './jobs';

type Counted = Pick<Job, 'status' | 'price' | 'created_at' | 'responded_at' | 'paid_at'>;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Earnings count only jobs marked paid, on the day they were paid. Acceptance covers the last 30 days. */
export function jobStats(jobs: Counted[], now = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i));
  const perDay = days.map((day) => {
    const paid = jobs.filter((j) => j.status === 'paid' && j.paid_at && dayKey(new Date(j.paid_at)) === dayKey(day));
    return { day, total: paid.reduce((sum, j) => sum + Number(j.price), 0), count: paid.length };
  });
  const since = now.getTime() - 30 * 86_400_000;
  const answered = jobs.filter((j) => j.responded_at && Date.parse(j.created_at) >= since);
  const accepted = answered.filter((j) => j.status !== 'declined').length;
  return {
    perDay,
    today: perDay[6],
    week: { total: perDay.reduce((s, d) => s + d.total, 0), count: perDay.reduce((s, d) => s + d.count, 0) },
    answered: answered.length,
    /** null until at least one request was answered. */
    acceptance: answered.length ? Math.round((accepted / answered.length) * 100) : null,
  };
}
