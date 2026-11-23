import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Hero, IconBadge } from '@/components/Hero';
import { PostList } from '@/components/PostList';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme, type TintName } from '@/lib/theme';
import { ROLE_LABEL } from '@/lib/types';

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
  const { session, profile, isAdmin } = useAuth();
  const userId = session?.user.id;

  if (!session)
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Hero gecko title="Stuck on the road?" text="You can find and call help without an account.">
          <Button title="Sign in or join" variant="sun" icon="person-add" onPress={() => router.push('/sign-in')} />
        </Hero>
        <Perk icon="images" tint="blue" title="Share with riders" text="Post photos and road tips in the feed." />
        <Perk icon="bicycle" tint="green" title="Fix tires on the road?" text="Join as a Vulcator and get on the map." />
        <Perk icon="build" tint="coral" title="Own a vulcanizing shop?" text="Let customers find your shop." />
        <Version />
      </ScrollView>
    );

  const username = profile?.username ?? '';

  const header = (
    <View style={styles.header}>
      <Hero>
        <View style={styles.person}>
          <View style={styles.avatarRing}>
            <Avatar name={username || '?'} path={profile?.avatar_url} size={92} />
          </View>
          <Text style={[styles.username, { color: t.onHero }]}>{username ? `@${username}` : ' '}</Text>
          <Text style={[styles.email, { color: t.onHero }]}>{session?.user.email}</Text>
          {profile && <Text style={[styles.role, { backgroundColor: t.sun, color: t.onSun }]}>{isAdmin ? 'Admin' : ROLE_LABEL[profile.role]}</Text>}
        </View>
      </Hero>
      <View style={[styles.menu, { backgroundColor: t.card, borderColor: t.border }]}>
        <Row icon="create" tint="green" title="Edit profile" onPress={() => router.push('/edit-profile')} />
        <Row icon="lock-closed" tint="blue" title="Change password" onPress={() => router.push('/change-password')} />
        <Row icon="log-out" tint="coral" title="Sign out" onPress={confirmSignOut} />
      </View>
      <Version />
      {!isAdmin && <Text style={[styles.sectionTitle, { color: t.text }]}>My posts</Text>}
    </View>
  );

  // Admins have no feed, so no posts to list.
  if (isAdmin) return <ScrollView contentContainerStyle={styles.page}>{header}</ScrollView>;

  return (
    <PostList
      onlyUserId={userId}
      header={header}
      emptyTitle="Nothing here yet"
      emptyMessage="Your posts will show up here. Share your first photo!"
    />
  );
}

type Item = { icon: keyof typeof Ionicons.glyphMap; tint: TintName; title: string };

function Row({ icon, tint, title, onPress }: Item & { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <IconBadge icon={icon} tint={tint} />
      <Text style={[styles.rowTitle, { color: t.text }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={t.muted} />
    </Pressable>
  );
}

function Perk({ icon, tint, title, text }: Item & { text: string }) {
  const t = useTheme();
  return (
    <View style={[styles.perk, { backgroundColor: t.card, borderColor: t.border }]}>
      <IconBadge icon={icon} tint={tint} />
      <View style={styles.flex}>
        <Text style={[styles.perkTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.perkText, { color: t.muted }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: 16, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  header: { gap: 16, marginBottom: 16 },
  person: { alignItems: 'center' },
  avatarRing: { padding: 4, borderRadius: 60, backgroundColor: '#FFFFFF' },
  username: { fontSize: 24, fontWeight: '800', marginTop: 10 },
  email: { fontSize: 15, marginTop: 2 },
  role: { fontSize: 13, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  menu: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64 },
  rowTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, padding: 16 },
  perkTitle: { fontSize: 16, fontWeight: '800' },
  perkText: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  version: { fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
});
