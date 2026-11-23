import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { TextField } from '@/components/TextField';
import { ACCOUNTS_PAGE, getAccounts, setAccountStatus } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { friendlyError } from '@/lib/errors';
import { useTheme } from '@/lib/theme';
import { timeAgo } from '@/lib/time';
import { ROLE_LABEL, STATUS_LABEL, type Profile, type Role } from '@/lib/types';

const FILTERS: { key: Role | undefined; label: string }[] = [
  { key: undefined, label: 'All' },
  { key: 'user', label: 'Users' },
  { key: 'vulcator', label: 'Vulcators' },
  { key: 'shop', label: 'Shops' },
];

/** Who created an account. Owners can be suspended or brought back; users need no approval. */
export default function Accounts() {
  const t = useTheme();
  const { profile: me } = useAuth();
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<Profile[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0); // only the newest search may update the list
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    const mine = ++request.current;
    try {
      const page = await getAccounts({ role, search, notId: me?.id });
      if (mine !== request.current) return;
      setAccounts(page);
      setHasMore(page.length === ACCOUNTS_PAGE);
      setError(null);
    } catch (e) {
      if (mine === request.current) setError(friendlyError(e));
    }
  }, [role, search, me?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!hasMore || !accounts || loadingMore.current) return;
    loadingMore.current = true;
    const mine = request.current;
    try {
      const page = await getAccounts({ role, search, notId: me?.id, from: accounts.length });
      if (mine !== request.current) return;
      setAccounts([...accounts, ...page.filter((p) => !accounts.some((a) => a.id === p.id))]);
      setHasMore(page.length === ACCOUNTS_PAGE);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      loadingMore.current = false;
    }
  };

  const decide = async (p: Profile, status: 'approved' | 'rejected') => {
    if (
      status === 'rejected' &&
      !(await confirm('Suspend this account?', `@${p.username}'s pin will be hidden from the map.`, 'Suspend'))
    )
      return;
    setBusyId(p.id);
    try {
      await setAccountStatus(p.id, status);
      setAccounts((cur) => cur?.map((a) => (a.id === p.id ? { ...a, status } : a)) ?? null);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FlatList
      data={accounts ?? []}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      onEndReached={loadMore}
      ListHeaderComponent={
        <View style={styles.header}>
          <TextField label="Search username" icon="search" placeholder="e.g. carl" value={search} onChangeText={setSearch} maxLength={20} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((f) => {
              const active = f.key === role;
              return (
                <Pressable
                  key={f.label}
                  onPress={() => setRole(f.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, { backgroundColor: active ? t.primary : t.card, borderColor: active ? t.primary : t.border }]}
                >
                  <Text style={[styles.chipText, { color: active ? t.onPrimary : t.text }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {error && <Notice kind="error" text={error} />}
        </View>
      }
      ListEmptyComponent={
        accounts ? (
          <EmptyState title="No accounts here" message="Try another name or filter." />
        ) : error ? (
          <Button title="Try again" onPress={load} />
        ) : (
          <ActivityIndicator size="large" color={t.accent} />
        )
      }
      renderItem={({ item: p }) => (
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.row}>
            <Avatar name={p.username} path={p.avatar_url} size={44} />
            <View style={styles.flex}>
              <Text style={[styles.name, { color: t.text }]}>@{p.username}</Text>
              <Text style={[styles.line, { color: t.muted }]}>
                {ROLE_LABEL[p.role]} · joined {timeAgo(p.created_at)}
              </Text>
            </View>
            {p.role !== 'user' && (
              <Text
                style={[
                  styles.badge,
                  p.status === 'approved'
                    ? { backgroundColor: t.successSoft, color: t.success }
                    : { backgroundColor: t.tints.amber.bg, color: t.tints.amber.fg },
                ]}
              >
                {STATUS_LABEL[p.status]}
              </Text>
            )}
          </View>
          {p.role !== 'user' && p.status === 'approved' && (
            <Button
              title="Suspend"
              icon="ban"
              variant="outline"
              onPress={() => decide(p, 'rejected')}
              loading={busyId === p.id}
              disabled={!!busyId}
            />
          )}
          {p.role !== 'user' && p.status === 'rejected' && (
            <Button
              title="Approve again"
              icon="checkmark"
              variant="outline"
              onPress={() => decide(p, 'approved')}
              loading={busyId === p.id}
              disabled={!!busyId}
            />
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  header: { gap: 12 },
  chips: { gap: 8 },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '700' },
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '800' },
  line: { fontSize: 14, marginTop: 2 },
  badge: { fontSize: 13, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
});
