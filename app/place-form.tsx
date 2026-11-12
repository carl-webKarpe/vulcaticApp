import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Notice } from '@/components/Notice';
import { TextField } from '@/components/TextField';
import { friendlyError } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { getPlace, isInSiargao, KIND_LABEL, savePlace, type PlaceKind } from '@/lib/places';
import { brand, useTheme } from '@/lib/theme';

/** Admin only: add a new pin (with lat/lng params) or edit one (with id param). */
export default function PlaceForm() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string; lat?: string; lng?: string }>();
  const editId = params.id ? Number(params.id) : undefined;

  const [kind, setKind] = useState<PlaceKind>('shop');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState({ lat: Number(params.lat ?? 0), lng: Number(params.lng ?? 0) });
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    getPlace(editId)
      .then((p) => {
        setKind(p.kind);
        setName(p.name);
        setAddress(p.address ?? '');
        setPhone(p.phone ?? '');
        setHours(p.hours ?? '');
        setDescription(p.description ?? '');
        setCoords({ lat: p.lat, lng: p.lng });
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, [editId]);

  const save = async () => {
    if (name.trim().length < 2) return setError('Please enter a name (at least 2 letters).');
    if (!isInSiargao(coords.lat, coords.lng)) return setError('The pin must be on Siargao Island.');
    setError(null);
    setSaving(true);
    try {
      await savePlace(
        {
          kind,
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          hours: hours.trim() || null,
          description: description.trim() || null,
          lat: coords.lat,
          lng: coords.lng,
        },
        editId,
      );
      haptic.success();
      router.back();
    } catch (e) {
      const msg = friendlyError(e);
      setError(msg.includes('row-level security') ? 'Only admins can change map pins.' : msg);
    } finally {
      setSaving(false);
    }
  };

  const kindButton = (k: PlaceKind) => {
    const active = kind === k;
    const color = k === 'shop' ? brand.orange : t.success;
    return (
      <Pressable
        onPress={() => setKind(k)}
        style={[styles.kind, { borderColor: active ? color : t.border, backgroundColor: active ? (k === 'shop' ? t.accentSoft : t.successSoft) : t.card }]}
        accessibilityRole="radio"
        accessibilityState={{ checked: active }}
      >
        <Ionicons name={k === 'shop' ? 'build' : 'bicycle'} size={22} color={active ? color : t.muted} />
        <Text style={[styles.kindTitle, { color: active ? t.text : t.muted }]}>{KIND_LABEL[k]}</Text>
        <Text style={[styles.kindHint, { color: t.muted }]}>{k === 'shop' ? 'Fixed place' : 'Comes to you'}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: editId ? 'Edit pin' : 'New pin' }} />
      {loading ? (
        <View style={[styles.center, { backgroundColor: t.background }]}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.kinds}>
              {kindButton('shop')}
              {kindButton('vulcator')}
            </View>
            <TextField label="Name" icon="storefront-outline" placeholder="e.g. Tropa Tire Vulcanizing" value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" />
            <TextField
              label={kind === 'shop' ? 'Address' : 'Area covered'}
              icon="location-outline"
              placeholder={kind === 'shop' ? 'e.g. Tourism Rd, General Luna' : 'e.g. General Luna & Union'}
              value={address}
              onChangeText={setAddress}
              maxLength={160}
              autoCapitalize="words"
            />
            <TextField label="Phone" icon="call-outline" placeholder="0917 123 4567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={30} />
            <TextField label="Hours" icon="time-outline" placeholder="e.g. 7:00 AM – 8:00 PM or 24/7" value={hours} onChangeText={setHours} maxLength={60} />
            <TextField
              label="Description"
              icon="information-circle-outline"
              placeholder="What they fix, prices, landmarks…"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              autoCapitalize="sentences"
              style={{ minHeight: 44 }}
            />
            <View style={[styles.coords, { backgroundColor: t.card, borderColor: t.border }]}>
              <Ionicons name="pin" size={18} color={t.accent} />
              <Text style={{ color: t.muted, flex: 1 }}>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            </View>
            {error && <Notice kind="error" text={error} />}
            <Button title={editId ? 'Save changes' : 'Add to map'} icon="checkmark" onPress={save} loading={saving} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 14, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  kinds: { flexDirection: 'row', gap: 10 },
  kind: { flex: 1, borderWidth: 2, borderRadius: 16, padding: 14, gap: 4 },
  kindTitle: { fontSize: 14, fontWeight: '800' },
  kindHint: { fontSize: 12 },
  coords: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
});
