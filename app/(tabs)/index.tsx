import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceCard } from '@/components/map/PlaceCard';
import { PlacesMap, type PlacesMapHandle } from '@/components/map/PlacesMap';
import { Notice } from '@/components/Notice';
import { friendlyError } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { deletePlace, isInSiargao, SIARGAO_CENTER, useIsAdmin, usePlaces, type PlaceKind } from '@/lib/places';
import { brand, useTheme } from '@/lib/theme';

type Filter = 'all' | PlaceKind;

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function MapScreen() {
  const t = useTheme();
  const map = useRef<PlacesMapHandle>(null);
  const { places, error, reload } = usePlaces();
  const isAdmin = useIsAdmin();

  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const center = useRef(SIARGAO_CENTER);

  const all = places ?? [];
  const shown = useMemo(() => (filter === 'all' ? all : all.filter((p) => p.kind === filter)), [all, filter]);
  const selected = all.find((p) => p.id === selectedId) ?? null;
  const counts = { all: all.length, shop: all.filter((p) => p.kind === 'shop').length, vulcator: all.filter((p) => p.kind === 'vulcator').length };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  };

  const locateMe = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        showToast('Allow location access to see where you are on the map.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMe(here);
      if (isInSiargao(here.lat, here.lng)) map.current?.focus(here.lat, here.lng, 14.5);
      else showToast("You're not on Siargao right now, so the map stays on the island.");
    } catch (e) {
      showToast(friendlyError(e));
    } finally {
      setLocating(false);
    }
  };

  const onDelete = async () => {
    if (!selected) return;
    if (!(await confirm('Delete this pin?', `"${selected.name}" will be removed from everyone's map.`))) return;
    try {
      await deletePlace(selected.id);
      setSelectedId(null);
      haptic.success();
    } catch (e) {
      showToast(friendlyError(e));
    }
  };

  const chip = (key: Filter, label: string, color: string) => {
    const active = filter === key;
    return (
      <Pressable
        key={key}
        onPress={() => {
          setFilter(key);
          setSelectedId(null);
          haptic.tap();
        }}
        style={[
          styles.chip,
          { backgroundColor: active ? t.text : t.card, borderColor: active ? t.text : t.border },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        {key !== 'all' && <View style={[styles.dot, { backgroundColor: color }]} />}
        <Text style={[styles.chipText, { color: active ? t.card : t.text }]}>
          {label} {places ? counts[key] : ''}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.background }]}>
      <PlacesMap
        ref={map}
        places={shown}
        selectedId={selectedId}
        me={me}
        picking={picking}
        onSelect={(id) => {
          if (picking) return;
          setSelectedId(id);
          if (id) haptic.tap();
        }}
        onCenter={(c) => (center.current = c)}
        onReady={() => setMapReady(true)}
        onError={() => setMapError(true)}
      />

      {/* Header + filters */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={[styles.header, { backgroundColor: t.card, borderColor: t.border }]}>
          <Image source={require('@/assets/images/gecko-head.png')} style={styles.headerIcon} contentFit="contain" />
          <View style={styles.flex}>
            <Text style={[styles.title, { color: t.text }]}>Vulcanizing near you</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>Siargao Island</Text>
          </View>
          <View style={[styles.live, { backgroundColor: t.successSoft }]}>
            <View style={[styles.liveDot, { backgroundColor: t.success }]} />
            <Text style={[styles.liveText, { color: t.success }]}>LIVE</Text>
          </View>
        </View>
        {!picking && (
          <View style={styles.chips}>
            {chip('all', 'All', t.text)}
            {chip('shop', 'Shops', brand.orange)}
            {chip('vulcator', 'Vulcators', brand.green)}
          </View>
        )}
        {(error || mapError) && (
          <Pressable
            onPress={() => {
              setMapError(false);
              reload();
            }}
            style={styles.notice}
          >
            <Notice kind="error" text={`${mapError ? "Couldn't load the map." : error} Tap to try again.`} />
          </Pressable>
        )}
        {toast && (
          <View style={styles.notice}>
            <Notice kind="error" text={toast} />
          </View>
        )}
      </SafeAreaView>

      {!mapReady && !mapError && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingText, { color: t.muted }]}>Loading the map of Siargao…</Text>
        </View>
      )}

      {/* Admin: choose a spot by moving the map under the center pin */}
      {picking && (
        <>
          <View style={styles.crosshair} pointerEvents="none">
            <Ionicons name="location" size={48} color={brand.orange} style={styles.crosshairIcon} />
          </View>
          <View style={styles.bottom}>
            <View style={[styles.pickCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <Text style={[styles.pickTitle, { color: t.text }]}>Move the map to place the pin</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>Zoom in close for an exact spot.</Text>
              <View style={styles.pickButtons}>
                <Pressable onPress={() => setPicking(false)} style={[styles.pickBtn, { borderColor: t.border, borderWidth: 1.5 }]}>
                  <Text style={{ color: t.text, fontWeight: '700' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPicking(false);
                    router.push({ pathname: '/place-form', params: { lat: String(center.current.lat), lng: String(center.current.lng) } });
                  }}
                  style={[styles.pickBtn, { backgroundColor: t.primary }]}
                >
                  <Ionicons name="checkmark" size={18} color={t.onPrimary} />
                  <Text style={{ color: t.onPrimary, fontWeight: '700' }}>Use this spot</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Floating buttons */}
      {!picking && (
        <View style={[styles.fabs, { bottom: selected ? undefined : 24, top: selected ? 170 : undefined }]}>
          <Pressable
            onPress={locateMe}
            style={[styles.fab, { backgroundColor: t.card, borderColor: t.border }]}
            accessibilityLabel="Show my location"
          >
            {locating ? <ActivityIndicator color={t.accent} /> : <Ionicons name="locate" size={24} color={t.accent} />}
          </Pressable>
          <Pressable
            onPress={() => {
              setSelectedId(null);
              map.current?.resetView();
            }}
            style={[styles.fab, { backgroundColor: t.card, borderColor: t.border }]}
            accessibilityLabel="Show the whole island"
          >
            <Ionicons name="scan-outline" size={22} color={t.text} />
          </Pressable>
        </View>
      )}

      {!picking && (
        <View style={styles.bottom} pointerEvents="box-none">
          {selected ? (
            <PlaceCard
              place={selected}
              me={me}
              isAdmin={isAdmin}
              onClose={() => setSelectedId(null)}
              onEdit={() => router.push({ pathname: '/place-form', params: { id: String(selected.id) } })}
              onDelete={onDelete}
            />
          ) : (
            isAdmin && (
              <Pressable
                onPress={() => {
                  setPicking(true);
                  haptic.tap();
                }}
                style={({ pressed }) => [styles.addBtn, { backgroundColor: t.primary }, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="add-circle" size={22} color={t.onPrimary} />
                <Text style={[styles.addText, { color: t.onPrimary }]}>Add a pin</Text>
              </Pressable>
            )
          )}
        </View>
      )}
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 5,
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, paddingTop: 8, gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    paddingRight: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadow,
  },
  headerIcon: { width: 40, height: 40 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    ...shadow,
  },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' },
  chipText: { fontSize: 14, fontWeight: '700' },
  notice: { ...shadow, borderRadius: 12 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  fabs: { position: 'absolute', right: 12, gap: 10 },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    ...shadow,
  },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 16, alignItems: 'stretch' },
  addBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 50,
    borderRadius: 25,
    ...shadow,
  },
  addText: { fontSize: 16, fontWeight: '800' },
  crosshair: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  crosshairIcon: { marginTop: -48, textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 6 },
  pickCard: { borderRadius: 20, padding: 16, gap: 4, borderWidth: StyleSheet.hairlineWidth, ...shadow },
  pickTitle: { fontSize: 16, fontWeight: '800' },
  pickButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  pickBtn: { flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
});
