import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PostList } from '@/components/PostList';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from '@/lib/places';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { Role } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = { user: 'User', vulcator: 'Mobile Vulcator', shop: 'Vulcanizing shop' };

function Version() {
  const t = useTheme();
  return <Text style={[styles.version, { color: t.muted }]}>Vulcatic version {Constants.expoConfig?.version}</Text>;
}

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
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const isAdmin = useIsAdmin();

  if (!session)
    return (
      <View>
        <EmptyState
          title="You're using Vulcatic as a guest"
          message="Sign in to post, or to list your shop or mobile service on the map."
          actionTitle="Sign in or join"
          onAction={() => router.push('/sign-in')}
        />
        <Version />
      </View>
    );

  const username = profile?.username ?? '';

  const header = (
    <View style={[styles.header, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[styles.banner, { backgroundColor: t.primary }]} />
      <View style={[styles.avatarRing, { backgroundColor: t.card }]}>
        <Avatar name={username || '?'} size={84} />
      </View>
      <Text style={[styles.username, { color: t.text }]}>{username ? `@${username}` : ' '}</Text>
      <Text style={[styles.email, { color: t.muted }]}>{session?.user.email}</Text>
      {profile && <Text style={[styles.email, { color: t.text }]}>{isAdmin ? 'Admin' : ROLE_LABEL[profile.role]}</Text>}
      {isAdmin && (
        <View style={styles.adminBtn}>
          <Button title="Waiting for approval" icon="checkmark-done" onPress={() => router.push('/approvals')} />
        </View>
      )}
      <View style={styles.adminBtn}>
        <Button title="Change password" icon="lock-closed-outline" variant="outline" onPress={() => router.push('/change-password')} />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOut, { borderColor: t.border }, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="log-out-outline" size={18} color={t.text} />
        <Text style={[styles.signOutText, { color: t.text }]}>Sign out</Text>
      </Pressable>
      <Version />
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
    height: 48,
    marginTop: 14,
  },
  adminBtn: { marginTop: 14 },
  version: { fontSize: 13, textAlign: 'center', marginTop: 12 },
  signOutText: { fontWeight: '600' },
  sectionTitle: { alignSelf: 'flex-start', marginLeft: 16, marginTop: 18, fontSize: 16, fontWeight: '800' },
});
