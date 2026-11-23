import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { callPlace, distanceKm, formatDistance, KIND_LABEL, statusLabel, type Place } from '@/lib/places';
import { useTheme } from '@/lib/theme';

type Props = { place: Place; me: { lat: number; lng: number } | null; onPress: () => void };

/** One line in the "nearest help" list: tap to open, or call straight away. */
export function NearRow({ place, me, onPress }: Props) {
  const t = useTheme();
  const details = [me && formatDistance(distanceKm(me, place)), statusLabel(place) ?? place.hours, place.address].filter(Boolean);
  return (
    <View style={[styles.row, { borderTopColor: t.border }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${KIND_LABEL[place.kind]}, ${details.join(', ')}`}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name={place.kind === 'shop' ? 'build' : 'bicycle'} size={24} color={place.kind === 'shop' ? t.accent : t.success} />
        <View style={styles.text}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={[styles.details, { color: t.muted }]} numberOfLines={2}>
            {details.join(' · ')}
          </Text>
        </View>
      </Pressable>
      {place.phone && (
        <Pressable
          onPress={() => callPlace(place.phone)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${place.name}`}
          style={({ pressed }) => [styles.call, { backgroundColor: t.primary }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="call" size={18} color={t.onPrimary} />
          <Text style={{ color: t.onPrimary, fontWeight: '700', fontSize: 15 }}>Call</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  details: { fontSize: 14, marginTop: 2 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 14, borderRadius: 14 },
});
