import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, useTheme } from '@/lib/theme';
import { directionsUrl, distanceKm, formatDistance, KIND_LABEL, type Place } from '@/lib/places';

type Props = {
  place: Place;
  me: { lat: number; lng: number } | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function PlaceCard({ place, me, isAdmin, onClose, onEdit, onDelete }: Props) {
  const t = useTheme();
  const isShop = place.kind === 'shop';
  const kindColor = isShop ? t.accent : t.success;
  const phone = place.phone?.replace(/[^\d+]/g, '');

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: isShop ? brand.orange : brand.green }]}>
          {isShop ? (
            <Ionicons name="build" size={22} color="#fff" />
          ) : (
            <Image source={require('@/assets/images/gecko-head.png')} style={styles.gecko} contentFit="contain" />
          )}
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={2}>
            {place.name}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: isShop ? t.accentSoft : t.successSoft }]}>
              <Text style={[styles.badgeText, { color: kindColor }]}>
                {isShop ? KIND_LABEL.shop : `${KIND_LABEL.vulcator} · comes to you`}
              </Text>
            </View>
            {place.is_demo && (
              <View style={[styles.badge, { backgroundColor: t.skeleton }]}>
                <Text style={[styles.badgeText, { color: t.muted }]}>DEMO</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close-circle" size={28} color={t.muted} />
        </Pressable>
      </View>

      <View style={styles.rows}>
        {place.address && <Row icon="location-outline" text={place.address} />}
        {place.hours && <Row icon="time-outline" text={place.hours} />}
        {me && <Row icon="navigate-outline" text={formatDistance(distanceKm(me, place))} />}
        {place.description && <Text style={[styles.desc, { color: t.muted }]}>{place.description}</Text>}
      </View>

      <View style={styles.actions}>
        {phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={({ pressed }) => [styles.action, { backgroundColor: t.primary }, pressed && styles.pressed]}
          >
            <Ionicons name="call" size={18} color={t.onPrimary} />
            <Text style={[styles.actionText, { color: t.onPrimary }]}>Call</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => Linking.openURL(directionsUrl(place))}
          style={({ pressed }) => [
            styles.action,
            phone ? { borderWidth: 1.5, borderColor: t.border } : { backgroundColor: t.primary },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="navigate" size={18} color={phone ? t.text : t.onPrimary} />
          <Text style={[styles.actionText, { color: phone ? t.text : t.onPrimary }]}>Directions</Text>
        </Pressable>
      </View>

      {isAdmin && (
        <View style={[styles.admin, { borderTopColor: t.border }]}>
          <Text style={[styles.adminLabel, { color: t.muted }]}>ADMIN</Text>
          <Pressable onPress={onEdit} hitSlop={8} style={styles.adminBtn}>
            <Ionicons name="create-outline" size={18} color={t.accent} />
            <Text style={{ color: t.accent, fontWeight: '700' }}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8} style={styles.adminBtn}>
            <Ionicons name="trash-outline" size={18} color={t.danger} />
            <Text style={{ color: t.danger, fontWeight: '700' }}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={17} color={t.muted} />
      <Text style={[styles.rowText, { color: t.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gecko: { width: 40, height: 40, marginTop: 6 },
  titleWrap: { flex: 1, gap: 6 },
  name: { fontSize: 18, fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  rows: { gap: 7 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rowText: { fontSize: 14, flex: 1 },
  desc: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  admin: { flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  adminLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, flex: 1 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
