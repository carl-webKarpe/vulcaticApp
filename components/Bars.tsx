import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

/** Every bar shows its name and number, so the chart also reads as a table. */
export function Bars({ rows, format = String }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const t = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={styles.bars}>
      {rows.map((r) => (
        <View key={r.label} accessible accessibilityLabel={`${r.label}: ${format(r.value)}`} style={styles.row}>
          <Text style={[styles.label, { color: t.text }]}>{r.label}</Text>
          <View style={styles.flex}>
            <View style={[styles.bar, { backgroundColor: t.accent, width: `${(r.value / max) * 100}%` }]} />
          </View>
          <Text style={[styles.value, { color: t.text }]}>{format(r.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bars: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 76, fontSize: 14 },
  bar: { height: 14, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  value: { minWidth: 28, fontSize: 14, fontWeight: '700', textAlign: 'right' },
});
