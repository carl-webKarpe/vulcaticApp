import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NearRow } from '@/components/map/NearRow';
import { PlaceCard } from '@/components/map/PlaceCard';
import { PlacesMap, type PlacesMapHandle } from '@/components/map/PlacesMap';
import { Notice } from '@/components/Notice';
import { confirm } from '@/lib/confirm';
import { friendlyError } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { deletePlace, distanceKm, isInSiargao, openStatus, SIARGAO_CENTER, useIsAdmin, usePlaces, type PlaceKind } from '@/lib/places';
import { brand, useTheme } from '@/lib/theme';

type Filter = 'all' | 'open' | PlaceKind;

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
  const [search, setSearch] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const center = useRef(SIARGAO_CENTER);
  // Owners come here from "My shop" to choose their spot: pick=new, or pick=<their pin id>.
  const { pick } = useLocalSearchParams<{ pick?: string }>();

  useEffect(() => {
    if (!pick) return;
    setSelectedId(null);
    setListOpen(false);
    setPicking(true);
  }, [pick]);

  const all = places ?? [];
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (places ?? []).filter(
      (p) =>
        (filter === 'all' || (filter === 'open' ? openStatus(p) === true : p.kind === filter)) &&
        (!q || `${p.name} ${p.address ?? ''}`.toLowerCase().includes(q)),
    );
    return me ? list.sort((a, b) => distanceKm(me, a) - distanceKm(me, b)) : list;
  }, [places, filter, search, me]);
  const selected = all.find((p) => p.id === selectedId) ?? null;
  const counts = { all: all.length, open: all.filter((p) => openStatus(p) === true).length, shop: all.filter((p) => p.kind === 'shop').length, vulcator: all.filter((p) => p.kind === 'vulcator').length };

  const stopPicking = () => {
    setPicking(false);
    router.setParams({ pick: undefined });
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  };

  const locateMe = async (move = true) => {
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
      if (!isInSiargao(here.lat, here.lng)) showToast("You're not on Siargao right now, so the map stays on the island.");
      else if (move) map.current?.focus(here.lat, here.lng, 14.5);
    } catch (e) {
      showToast(friendlyError(e));
    } finally {
      setLocating(false);
    }
  };

  const onDelete = async () => {
    if (!selected) return;
    if (!(await confirm('Delete this pin?', `"${selected.name}" will be removed from everyone's map.`, 'Delete'))) return;
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
        {(key === 'shop' || key === 'vulcator') && <View style={[styles.dot, { backgroundColor: color }]} />}
        <Text style={[styles.chipText, { color: active ? t.card : t.text }]}>
          {label} {places ? counts[key] : ''}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.background }]}>
      <PlacesMap
        key={mapKey}
        ref={map}
        places={shown}
        selectedId={selectedId}
        me={me}
        picking={picking}
        onSelect={(id) => {
          if (picking) return;
          setSelectedId(id);
          setListOpen(false);
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
          <TextInput
            style={[styles.search, { color: t.text }]}
            placeholder="Search a name or town"
            placeholderTextColor={t.muted}
            accessibilityLabel="Search shops and Vulcators by name or town"
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setSelectedId(null);
            }}
            returnKeyType="search"
            onSubmitEditing={() => setListOpen(true)}
            editable={!picking}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={24} color={t.muted} />
            </Pressable>
          ) : (
            <Ionicons name="search" size={22} color={t.muted} />
          )}
        </View>
        {!picking && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {chip('all', 'All', t.text)}
            {chip('shop', 'Shops', brand.orange)}
            {chip('vulcator', 'Vulcators', brand.green)}
            {chip('open', 'Open now', t.text)}
          </ScrollView>
        )}
        {(error || mapError) && (
          <Pressable
            onPress={() => {
              if (mapError) {
                setMapError(false);
                setMapReady(false);
                setMapKey((k) => k + 1);
              }
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

      {/* Admins and owners: choose a spot by moving the map under the center pin */}
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
                <Pressable onPress={stopPicking} style={[styles.pickBtn, { borderColor: t.border, borderWidth: 1.5 }]}>
                  <Text style={{ color: t.text, fontWeight: '700' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const id = pick && pick !== 'new' ? { id: pick } : {};
                    stopPicking();
                    router.push({ pathname: '/place-form', params: { ...id, lat: String(center.current.lat), lng: String(center.current.lng) } });
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
      {!picking && !listOpen && (
        <View style={[styles.fabs, { bottom: selected ? undefined : 88, top: selected ? 170 : undefined }]}>
          <Pressable
            onPress={() => locateMe()}
            accessibilityRole="button"
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
          ) : listOpen ? (
            <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={styles.sheetHead}>
                <Text style={[styles.sheetTitle, { color: t.text }]}>{me ? 'Nearest help' : 'Places'}</Text>
                <Pressable onPress={() => setListOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close list">
                  <Ionicons name="chevron-down" size={28} color={t.text} />
                </Pressable>
              </View>
              {!me && (
                <Pressable onPress={() => locateMe(false)} style={styles.sheetHint} accessibilityRole="button">
                  <Ionicons name="locate" size={20} color={t.accent} />
                  <Text style={{ color: t.accent, fontWeight: '700', fontSize: 15 }}>
                    {locating ? 'Finding you…' : 'Use my location to show the nearest first'}
                  </Text>
                </Pressable>
              )}
              <FlatList
                data={shown}
                keyExtractor={(p) => String(p.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <NearRow
                    place={item}
                    me={me}
                    onPress={() => {
                      setListOpen(false);
                      setSelectedId(item.id);
                    }}
                  />
                )}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: t.muted }]}>
                    {!places ? 'Loading…' : all.length ? 'Nothing matches. Try another word or filter.' : 'No shops or Vulcators listed yet.'}
                  </Text>
                }
              />
            </View>
          ) : (
            <View style={styles.bottomRow} pointerEvents="box-none">
              <Pressable
                onPress={() => {
                  setListOpen(true);
                  if (!me) locateMe(false);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.addBtn, styles.nearBtn, { backgroundColor: t.primary }, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="list" size={22} color={t.onPrimary} />
                <Text style={[styles.addText, { color: t.onPrimary }]}>Find help</Text>
              </Pressable>
              {isAdmin && (
              <Pressable
                onPress={() => {
                  setPicking(true);
                  haptic.tap();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.addBtn, { backgroundColor: t.card }, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="add-circle" size={22} color={t.accent} />
                <Text style={[styles.addText, { color: t.accent }]}>Add a pin</Text>
              </Pressable>
              )}
            </View>
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
  search: { flex: 1, fontSize: 16, minHeight: 44, outlineStyle: 'none' } as object,
  chipScroll: { flexGrow: 0, marginHorizontal: -12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 4 },
  sheet: { maxHeight: 420, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 16, ...shadow },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetHint: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  emptyText: { fontSize: 15, textAlign: 'center', paddingVertical: 24 },
  bottomRow: { flexDirection: 'row', gap: 10 },
  nearBtn: { flex: 1, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 28,
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
