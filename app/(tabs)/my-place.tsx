import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Hero, IconBadge } from '@/components/Hero';
import { Pulse } from '@/components/Pulse';
import { Notice } from '@/components/Notice';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { friendlyError } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { deletePlace, getMyPlace, isInSiargao, openStatus, patchPlace, peso, SERVICE_KEYS, SERVICES, type Place } from '@/lib/places';
import { useTheme, type TintName } from '@/lib/theme';

/** Shop and Vulcator owners: switch open/available on or off, and look after their own pin. */
export default function MyPlace() {
  const t = useTheme();
  const { profile, refreshProfile } = useAuth();
  const userId = profile?.id;
  const isShop = profile?.role === 'shop';
  const [place, setPlace] = useState<Place | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setPlace(await getMyPlace(userId));
      setMessage(null);
    } catch (e) {
      setMessage({ text: friendlyError(e), kind: 'error' });
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Runs one action with a spinner, and shows what happened. */
  const run = async (name: string, action: () => Promise<string | null>) => {
    setBusy(name);
    setMessage(null);
    try {
      const done = await action();
      if (done) setMessage({ text: done, kind: 'success' });
      haptic.success();
    } catch (e) {
      setMessage({ text: friendlyError(e), kind: 'error' });
    } finally {
      setBusy(null);
    }
  };

  // A Vulcator or shop account needs the admin's OK before it can choose a spot.
  if (profile && profile.status !== 'approved')
    return (
      <View>
        <EmptyState
          icon={profile.status === 'pending' ? 'time-outline' : 'ban-outline'}
          title={profile.status === 'pending' ? 'Waiting for approval' : 'Account suspended'}
          message={
            profile.status === 'pending'
              ? 'An admin is checking your account. After that, you can choose your spot on the map.'
              : "You can't use this screen right now. Please contact the Vulcatic admin."
          }
          actionTitle="Check again"
          onAction={() => run('check', async () => (await refreshProfile(), null))}
        />
        {busy === 'check' && <ActivityIndicator color={t.accent} />}
        {message && (
          <View style={styles.container}>
            <Notice kind={message.kind} text={message.text} />
          </View>
        )}
      </View>
    );

  if (place === undefined)
    return message ? (
      <EmptyState title="Couldn't load" message={message.text} actionTitle="Try again" onAction={load} />
    ) : (
      <ActivityIndicator style={styles.loading} size="large" color={t.accent} />
    );

  if (!place)
    return (
      <EmptyState
        icon="location-outline"
        title={isShop ? 'Put your shop on the map' : 'Put your service on the map'}
        message="Choose your spot, add your phone number, and an admin will check it."
        actionTitle="Choose my spot"
        onAction={() => router.navigate({ pathname: '/', params: { pick: 'new' } })}
      />
    );

  const on = openStatus(place) === true;
  const onText = isShop ? 'OPEN' : 'AVAILABLE';
  const offText = isShop ? 'CLOSED' : 'OFF';

  const updateLocation = () =>
    run('location', async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error('Allow location access, then try again.');
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!isInSiargao(coords.latitude, coords.longitude))
        throw new Error("You're not on Siargao right now, so your pin was not moved.");
      setPlace(await patchPlace(place.id, { lat: coords.latitude, lng: coords.longitude }));
      return 'Your pin is now where you are.';
    });

  const remove = async () => {
    const sure = await confirm('Remove from the map?', `"${place.name}" will be deleted. You would need approval again.`, 'Remove');
    if (!sure) return;
    run('remove', async () => {
      await deletePlace(place.id);
      setPlace(null);
      return null;
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Hero>
        <View style={styles.photo}>
          <View style={styles.ring}>
            <Avatar name={place.name} path={profile?.avatar_url} size={84} />
          </View>
        </View>
        <Text style={[styles.name, { color: t.onHero }]}>{place.name}</Text>
        {place.approved && (
          <View style={styles.verified}>
            <Ionicons name="shield-checkmark" size={18} color={t.onHero} />
            <Text style={[styles.verifiedText, { color: t.onHero }]}>Verified</Text>
          </View>
        )}
        <Pulse color={t.sun} radius={24} on={on}>
        <Pressable
          onPress={() =>
            run('status', async () => {
              setPlace(await patchPlace(place.id, { is_open: !on }));
              return null;
            })
          }
          disabled={!!busy}
          accessibilityRole="switch"
          accessibilityState={{ checked: on, busy: busy === 'status' }}
          accessibilityLabel={isShop ? 'Shop is open' : 'I am available'}
          style={({ pressed }) => [
            styles.toggle,
            { backgroundColor: on ? t.sun : t.card },
            pressed && { opacity: 0.8 },
          ]}
        >
          {busy === 'status' ? (
            <ActivityIndicator size="large" color={on ? t.onSun : t.text} />
          ) : (
            <Ionicons name={on ? 'sunny' : 'moon'} size={44} color={on ? t.onSun : t.muted} />
          )}
          <Text style={[styles.toggleText, { color: on ? t.onSun : t.text }]}>{on ? onText : offText}</Text>
          <Text style={[styles.toggleHint, { color: on ? t.onSun : t.text }]}>Tap to switch to {on ? offText : onText}</Text>
        </Pressable>
        </Pulse>
        <Text style={[styles.note, { color: t.onHero }]}>
          {onText} is shown for 12 hours. Switch it on again each day you work.
        </Text>
      </Hero>

      {!place.approved && (
        <View style={[styles.waiting, { backgroundColor: t.accentSoft }]}>
          <Ionicons name="time" size={24} color={t.accent} />
          <Text style={[styles.waitingText, { color: t.text }]}>Waiting for approval. Customers can't see you yet.</Text>
        </View>
      )}

      {message && <Notice kind={message.kind} text={message.text} />}

      {!isShop && (
        <>
          <Button title="Update my location" icon="locate" onPress={updateLocation} loading={busy === 'location'} disabled={!!busy} />
          <Text style={[styles.note, { color: t.muted }]}>
            Your location is sent only when you tap this button. Everyone can see your pin.
          </Text>
        </>
      )}

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <Detail icon="call" tint="green" text={place.phone ?? 'No phone number yet'} />
        <Detail icon="location" tint="coral" text={place.address ?? 'No address yet'} />
        <Detail icon="time" tint="blue" text={place.hours ?? 'No hours yet'} />
        {SERVICE_KEYS.filter((k) => place.prices[k]).map((k) => (
          <Detail key={k} icon="pricetag" tint="amber" text={`${SERVICES[k]}: ${peso(place.prices[k]!)}`} />
        ))}
        <Button title="Edit photo & GCash" icon="camera-outline" variant="outline" onPress={() => router.push('/edit-profile')} />
        <Button
          title="Edit details & prices"
          icon="create-outline"
          variant="outline"
          onPress={() => router.push({ pathname: '/place-form', params: { id: String(place.id) } })}
        />
        <Button
          title="Change my spot on the map"
          icon="map-outline"
          variant="outline"
          onPress={() => router.navigate({ pathname: '/', params: { pick: String(place.id) } })}
        />
      </View>
      <Button title="Remove from the map" icon="trash-outline" variant="ghost" onPress={remove} loading={busy === 'remove'} disabled={!!busy} />
    </ScrollView>
  );
}

function Detail({ icon, tint, text }: { icon: keyof typeof Ionicons.glyphMap; tint: TintName; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.detail}>
      <IconBadge icon={icon} tint={tint} size={40} />
      <Text style={[styles.detailText, { color: t.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 64 },
  container: { padding: 16, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  waitingText: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  photo: { alignItems: 'center' },
  verified: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ring: { padding: 4, borderRadius: 50, backgroundColor: '#FFFFFF' },
  verifiedText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  toggle: { borderRadius: 24, padding: 20, alignItems: 'center', gap: 4, minHeight: 150, justifyContent: 'center' },
  toggleText: { fontSize: 28, fontWeight: '800' },
  toggleHint: { fontSize: 15 },
  note: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { flex: 1, fontSize: 16 },
});
