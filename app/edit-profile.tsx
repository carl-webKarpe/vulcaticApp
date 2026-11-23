import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { getPrivateDetails, saveAvatar, savePrivateDetails } from '@/lib/profile';
import { useTheme } from '@/lib/theme';

const tooShort = (number: string) => number.trim() !== '' && number.replace(/\D/g, '').length < 7;

export default function EditProfile() {
  const t = useTheme();
  const { profile, isAdmin, refreshProfile } = useAuth();
  const userId = profile?.id;
  const isOwner = !isAdmin && !!profile && profile.role !== 'user';
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gcash, setGcash] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setError(null);
    getPrivateDetails(userId)
      .then((d) => {
        if (!active) return;
        setFullName(d.full_name ?? '');
        setMobile(d.mobile ?? '');
        setGcash(d.gcash ?? '');
        setLoaded(true);
      })
      .catch((e) => active && setError(friendlyError(e)));
    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  const pick = async (camera: boolean) => {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    if (camera && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Allow camera access in your phone settings, then try again.');
    }
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const save = async () => {
    if (!userId) return;
    if (tooShort(mobile) || tooShort(gcash)) return setError('That phone number looks too short.');
    setError(null);
    setSaving(true);
    try {
      await savePrivateDetails(userId, {
        full_name: fullName.trim() || null,
        mobile: mobile.trim() || null,
        gcash: gcash.trim() || null,
      });
      if (photo) {
        await saveAvatar(userId, photo);
        setPhoto(null);
        await refreshProfile();
      }
      haptic.success();
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  // Never show an empty form when loading failed: saving it would wipe the real details.
  if (!loaded || !profile)
    return error ? (
      <EmptyState title="Couldn't load" message={error} actionTitle="Try again" onAction={() => setReloadKey((k) => k + 1)} />
    ) : (
      <ActivityIndicator style={styles.loading} size="large" color={t.accent} />
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.photo}>
          <Avatar name={profile.username} path={profile.avatar_url} uri={photo} size={112} />
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button title="Camera" icon="camera" variant="outline" onPress={() => pick(true)} />
          </View>
          <View style={styles.flex}>
            <Button title="Gallery" icon="images" variant="outline" onPress={() => pick(false)} />
          </View>
        </View>
        <TextField label="Full name" icon="person-outline" placeholder="e.g. Jose Dela Cruz" value={fullName} onChangeText={setFullName} maxLength={80} autoCapitalize="words" />
        <TextField label="Mobile number" icon="call-outline" placeholder="0917 123 4567" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} maxLength={30} />
        {isOwner && (
          <TextField label="GCash number" icon="wallet-outline" placeholder="0917 123 4567" keyboardType="phone-pad" value={gcash} onChangeText={setGcash} maxLength={30} />
        )}
        <Text style={[styles.note, { color: t.muted }]}>
          {isOwner
            ? 'Your name, mobile and GCash number are private: only you and the admin see them. A new photo or GCash number hides your pin until the admin checks it.'
            : 'Your name and mobile number are private. Other people can see your photo.'}
        </Text>
        {error && <Notice kind="error" text={error} />}
        <Button title="Save" variant="sun" icon="checkmark" onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 64 },
  container: { padding: 16, gap: 14, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  photo: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  note: { fontSize: 14, lineHeight: 20 },
});
