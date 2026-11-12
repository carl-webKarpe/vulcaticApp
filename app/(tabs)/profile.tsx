import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { PostList } from '@/components/PostList';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { Profile as ProfileRow } from '@/lib/types';

function confirmSignOut() {
  if (Platform.OS === 'web') {
    if (window.confirm('Sign out of Vulcatic?')) supabase.auth.signOut();
    return;
  }
  Alert.alert('Sign out?', 'You can sign back in any time.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
  ]);
}

export default function Profile() {
  const t = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single<ProfileRow>()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  const username = profile?.username ?? '';

  const header = (
    <View style={[styles.header, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[styles.banner, { backgroundColor: t.primary }]} />
      <View style={[styles.avatarRing, { backgroundColor: t.card }]}>
        <Avatar name={username || '?'} size={84} />
      </View>
      <Text style={[styles.username, { color: t.text }]}>{username ? `@${username}` : ' '}</Text>
      <Text style={[styles.email, { color: t.muted }]}>{session?.user.email}</Text>
      <Pressable
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOut, { borderColor: t.border }, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="log-out-outline" size={18} color={t.text} />
        <Text style={[styles.signOutText, { color: t.text }]}>Sign out</Text>
      </Pressable>
      <Text style={[styles.sectionTitle, { color: t.text }]}>My posts</Text>
    </View>
  );

  return (
    <PostList
      onlyUserId={userId}
      header={header}
      emptyTitle="Nothing here yet"
      emptyMessage="Your posts will show up here. Share your first photo!"
    />
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingBottom: 18,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  banner: { alignSelf: 'stretch', height: 70 },
  avatarRing: { padding: 4, borderRadius: 50, marginTop: -46 },
  username: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  email: { fontSize: 14, marginTop: 2 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 40,
    marginTop: 14,
  },
  signOutText: { fontWeight: '600' },
  sectionTitle: { alignSelf: 'flex-start', marginLeft: 16, marginTop: 18, fontSize: 16, fontWeight: '800' },
});
