import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { PostList } from '@/components/PostList';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { Profile as ProfileRow } from '@/lib/types';

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

  const username = profile?.username ?? '…';

  const header = (
    <View style={[styles.header, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[styles.avatar, { backgroundColor: t.primary }]}>
        <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={[styles.username, { color: t.text }]}>@{username}</Text>
      <Text style={{ color: t.muted }}>{session?.user.email}</Text>
      <View style={styles.signOut}>
        <Button title="Sign out" variant="outline" onPress={() => supabase.auth.signOut()} />
      </View>
    </View>
  );

  return <PostList onlyUserId={userId} header={header} emptyText="You haven't shared anything yet." />;
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    padding: 20,
    gap: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  username: { fontSize: 20, fontWeight: '700' },
  signOut: { alignSelf: 'stretch', marginTop: 10 },
});
