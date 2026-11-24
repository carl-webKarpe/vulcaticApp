import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { sendRequest, useJobs, VEHICLES, type Vehicle } from '@/lib/jobs';
import { getPlace, goesToCustomer, peso, SERVICE_KEYS, SERVICES, takesVisits, type Place, type ServiceKey } from '@/lib/places';
import { getPrivateDetails } from '@/lib/profile';
import { useTheme } from '@/lib/theme';

/** A customer asks one Vulcator or shop for help. */
export default function RequestScreen() {
  const t = useTheme();
  const { session } = useAuth();
  const { reload } = useJobs();
  const userId = session?.user.id;
  const { place: placeId } = useLocalSearchParams<{ place: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [service, setService] = useState<ServiceKey | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle>('motorcycle');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [share, setShare] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getPlace(Number(placeId))
      .then((p) => {
        setPlace(p);
        setService(SERVICE_KEYS.find((k) => p.prices[k]) ?? null);
      })
      .catch((e) => setError(friendlyError(e)));
    // Only saves typing, so a failure here is fine.
    getPrivateDetails(userId)
      .then((d) => setPhone((cur) => cur || (d.mobile ?? '')))
      .catch(() => {});
  }, [placeId, userId]);

  if (!place)
    return error ? (
      <EmptyState title="Couldn't load" message={error} actionTitle="Go back" onAction={() => router.back()} />
    ) : (
      <ActivityIndicator style={styles.loading} size="large" color={t.accent} />
    );

  // A Vulcator with no shop can only help if they know where to go.
  const mustShare = goesToCustomer(place) && !takesVisits(place);

  const send = async () => {
    if (!service) return setError('Choose a service.');
    if (phone.replace(/\D/g, '').length < 7) return setError('Enter your mobile number so they can call you.');
    if (mustShare && !share) return setError('They come to you, so please share your location.');
    setError(null);
    setSending(true);
    try {
      let spot: { lat: number | null; lng: number | null } = { lat: null, lng: null };
      if (share) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) throw new Error('Allow location access, or turn off "Send my location".');
        const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        spot = { lat: coords.latitude, lng: coords.longitude };
      }
      await sendRequest({ place_id: place.id, service, vehicle, phone: phone.trim(), note: note.trim() || null, ...spot });
      await reload();
      haptic.success();
      router.back();
      router.navigate('/requests');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(false);
    }
  };

  const choice = (key: string, on: boolean, label: string, right: string | null, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={[styles.choice, { borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accentSoft : t.card }]}
    >
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? t.accent : t.muted} />
      <Text style={[styles.choiceText, { color: t.text }]}>{label}</Text>
      {right && <Text style={[styles.price, { color: t.text }]}>{right}</Text>}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: t.text }]}>{place.name}</Text>
        <Text style={[styles.heading, { color: t.text }]}>What do you need?</Text>
        {SERVICE_KEYS.filter((k) => place.prices[k]).map((k) =>
          choice(k, service === k, SERVICES[k], peso(place.prices[k]!), () => setService(k)),
        )}
        <Text style={[styles.heading, { color: t.text }]}>Your vehicle</Text>
        <View style={styles.vehicles}>
          {(Object.keys(VEHICLES) as Vehicle[]).map((v) => (
            <View key={v} style={styles.half}>
              {choice(v, vehicle === v, VEHICLES[v], null, () => setVehicle(v))}
            </View>
          ))}
        </View>
        <TextField label="Your mobile number" icon="call-outline" placeholder="0917 123 4567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={30} />
        <TextField label="Note (optional)" icon="chatbubble-outline" placeholder="e.g. Near the blue store" value={note} onChangeText={setNote} maxLength={200} autoCapitalize="sentences" />
        <Pressable onPress={() => setShare(!share)} accessibilityRole="checkbox" accessibilityState={{ checked: share }} style={styles.check}>
          <Ionicons name={share ? 'checkbox' : 'square-outline'} size={26} color={share ? t.accent : t.muted} />
          <Text style={[styles.choiceText, { color: t.text }]}>Send my location now</Text>
        </Pressable>
        <Text style={[styles.note, { color: t.muted }]}>
          Only {place.name} sees your request, mobile number and location. Pay them directly, by cash or GCash.
        </Text>
        {error && <Notice kind="error" text={error} />}
        <Button title={service ? `Request · ${peso(place.prices[service]!)}` : 'Request'} icon="flash" variant="sun" onPress={send} loading={sending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 64 },
  container: { padding: 16, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800' },
  heading: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 18, paddingHorizontal: 14, minHeight: 54 },
  choiceText: { flex: 1, fontSize: 16 },
  price: { fontSize: 16, fontWeight: '800' },
  vehicles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { flexGrow: 1, flexBasis: '45%' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  note: { fontSize: 14, lineHeight: 20 },
});
