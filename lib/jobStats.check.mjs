// Run with: npm run check
import assert from 'node:assert/strict';

import { jobStats } from './jobStats.ts';

const now = new Date(2026, 10, 24, 15);
const at = (daysAgo, hour = 10) => new Date(2026, 10, 24 - daysAgo, hour).toISOString();
const job = (status, price, createdAgo, paidAgo) => ({
  status,
  price,
  created_at: at(createdAgo),
  responded_at: status === 'requested' || status === 'cancelled' ? null : at(createdAgo),
  paid_at: paidAgo === undefined ? null : at(paidAgo),
});

const empty = jobStats([], now);
assert.equal(empty.week.total, 0);
assert.equal(empty.acceptance, null);

const s = jobStats(
  [
    job('paid', 150, 0, 0),
    job('paid', '19.50', 1, 0), // the database may send prices as text
    job('paid', 100, 6, 6),
    job('paid', 999, 8, 7), // outside the 7 days
    job('done', 500, 0), // not paid yet
    job('declined', 50, 2),
    job('requested', 50, 0), // not answered yet
    job('declined', 50, 40), // older than 30 days
  ],
  now,
);
assert.deepEqual([s.today.total, s.today.count], [169.5, 2]);
assert.deepEqual([s.week.total, s.week.count], [269.5, 3]);
assert.equal(s.perDay[0].total, 100);
assert.equal(s.answered, 6);
assert.equal(s.acceptance, 83);
console.log('jobStats OK');
