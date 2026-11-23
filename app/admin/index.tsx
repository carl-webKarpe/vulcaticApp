import type { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Hero, IconBadge } from '@/components/Hero';
import { Pulse } from '@/components/Pulse';
import { Notice } from '@/components/Notice';
import { getReport, type Report } from '@/lib/admin';
import { friendlyError } from '@/lib/errors';
import { useTheme, type TintName } from '@/lib/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Dashboard() {
  const t = useTheme();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setReport(await getReport());
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!report)
    return error ? (
      <EmptyState title="Couldn't load" message={error} actionTitle="Try again" onAction={load} />
    ) : (
      <ActivityIndicator style={styles.loading} size="large" color={t.accent} />
    );

  const waiting = report.pending_accounts + report.pending_pins;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={t.accent}
          colors={[t.primary]}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      {error && <Notice kind="error" text={error} />}

      <Hero
        gecko
        title={waiting ? `${waiting} waiting for you` : 'All done!'}
        text={
          waiting
            ? `New accounts: ${report.pending_accounts}\nMap locations: ${report.pending_pins}`
            : 'No one is waiting for approval.'
        }
      >
        {waiting > 0 && (
          <Pulse color={t.sun} radius={18}>
            <Button title="Check now" variant="sun" icon="checkmark-done" onPress={() => router.navigate('/admin/approvals')} />
          </Pulse>
        )}
      </Hero>

      <View style={styles.tiles}>
        <Tile icon="person" tint="blue" label="Users" value={report.users} />
        <Tile icon="bicycle" tint="green" label="Vulcators" value={report.vulcators} />
        <Tile icon="build" tint="coral" label="Shops" value={report.shops} />
        <Tile icon="location" tint="coral" label="Live on map" value={report.live_pins} />
        <Tile icon="checkmark-circle" tint="green" label="Open now" value={report.open_now} />
        <Tile icon="ban" tint="amber" label="Suspended" value={report.rejected_accounts} />
      </View>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[styles.cardTitle, { color: t.text }]}>Report: new accounts, last 7 days</Text>
        <Bars
          rows={report.signups.map((s, i, all) => ({
            label: i === all.length - 1 ? 'Today' : `${DAYS[new Date(`${s.day}T00:00:00`).getDay()]} ${Number(s.day.slice(8))}`,
            value: s.count,
          }))}
        />
      </View>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[styles.cardTitle, { color: t.text }]}>Report: accounts by type</Text>
        <Bars
          rows={[
            { label: 'Users', value: report.users },
            { label: 'Vulcators', value: report.vulcators },
            { label: 'Shops', value: report.shops },
          ]}
        />
      </View>
      <Text style={[styles.note, { color: t.muted }]}>
        Counts only. Calls and dealings between customers, Vulcators and shops are private.
      </Text>
    </ScrollView>
  );
}

function Tile({ icon, tint, label, value }: { icon: keyof typeof Ionicons.glyphMap; tint: TintName; label: string; value: number }) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={[styles.tile, { backgroundColor: t.card, borderColor: t.border }]}>
      <IconBadge icon={icon} tint={tint} size={40} />
      <Text style={[styles.tileValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

/** Every bar shows its name and number, so the chart also reads as a table. */
function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const t = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={styles.bars}>
      {rows.map((r) => (
        <View key={r.label} accessible accessibilityLabel={`${r.label}: ${r.value}`} style={styles.barRow}>
          <Text style={[styles.barLabel, { color: t.text }]}>{r.label}</Text>
          <View style={styles.flex}>
            <View style={[styles.bar, { backgroundColor: t.accent, width: `${(r.value / max) * 100}%` }]} />
          </View>
          <Text style={[styles.barValue, { color: t.text }]}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 64 },
  container: { padding: 16, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexGrow: 1, flexBasis: '28%', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  tileValue: { fontSize: 28, fontWeight: '800' },
  tileLabel: { fontSize: 14 },
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  bars: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 76, fontSize: 14 },
  bar: { height: 14, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barValue: { minWidth: 28, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  note: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
