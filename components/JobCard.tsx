import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { JOB_STATUS, VEHICLES, type Job } from '@/lib/jobs';
import { peso, SERVICES } from '@/lib/places';
import { useTheme } from '@/lib/theme';
import { timeAgo } from '@/lib/time';

/** One job, seen by the customer or by the Vulcator/shop. Buttons go in `children`. */
export function JobCard({ job, forOwner, children }: { job: Job; forOwner?: boolean; children?: ReactNode }) {
  const t = useTheme();
  const name = forOwner ? `@${job.customer?.username ?? 'customer'}` : job.place_name;
  const tint = t.tints[job.status === 'paid' ? 'green' : job.status === 'declined' || job.status === 'cancelled' ? 'coral' : 'amber'];
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.row}>
        <Avatar name={forOwner ? (job.customer?.username ?? '?') : job.place_name} path={forOwner ? job.customer?.avatar_url : null} size={46} />
        <View style={styles.flex}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.line, { color: t.muted }]}>
            {SERVICES[job.service]} · {VEHICLES[job.vehicle]} · {timeAgo(job.created_at)}
          </Text>
        </View>
        <Text style={[styles.price, { color: t.text }]}>{peso(Number(job.price))}</Text>
      </View>
      <Text style={[styles.badge, { backgroundColor: tint.bg, color: tint.fg }]}>{JOB_STATUS[job.status]}</Text>
      {job.note ? <Text style={[styles.note, { color: t.text }]}>{job.note}</Text> : null}
      {job.rating ? <Text style={[styles.line, { color: t.text }]}>Rated {job.rating} of 5 stars</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 17, fontWeight: '800' },
  line: { fontSize: 14, lineHeight: 20 },
  price: { fontSize: 17, fontWeight: '800' },
  badge: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  note: { fontSize: 15, lineHeight: 21 },
});
