import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { getWaiting, setAccountStatus } from '@/lib/admin';
import { confirm } from '@/lib/confirm';
import { friendlyError } from '@/lib/errors';
import { deletePlace, directionsUrl, KIND_LABEL, patchPlace, peso, SERVICE_KEYS, SERVICES } from '@/lib/places';
import { useTheme } from '@/lib/theme';
import { timeAgo } from '@/lib/time';
import { ROLE_LABEL } from '@/lib/types';

/** Step 1: approve the account. Step 2: check its map location. The database enforces who may do this. */
export default function Approvals() {
  const t = useTheme();
  const [waiting, setWaiting] = useState<Awaited<ReturnType<typeof getWaiting>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);

  const load = useCallback(
    () =>
      getWaiting()
        .then(setWaiting)
        .catch((e) => setMessage({ text: friendlyError(e), kind: 'error' })),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      setMessage(null);
      load();
    }, [load]),
  );

  const run = async (key: string, done: string, action: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await action();
      await load();
      setMessage({ text: done, kind: 'success' });
    } catch (e) {
      setMessage({ text: friendlyError(e), kind: 'error' });
    } finally {
      setBusy(null);
    }
  };

  if (!waiting)
    return message ? (
      <EmptyState title="Couldn't load" message={message.text} actionTitle="Try again" onAction={load} />
    ) : (
      <ActivityIndicator style={styles.loading} size="large" color={t.accent} />
    );

  const card = [styles.card, { backgroundColor: t.card, borderColor: t.border }];
  const heading = [styles.heading, { color: t.text }];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {message && <Notice kind={message.kind} text={message.text} />}
      {!waiting.accounts.length && !waiting.pins.length && (
        <EmptyState title="All done" message="No one is waiting for approval." actionTitle="Check again" onAction={load} />
      )}

      {waiting.accounts.length > 0 && <Text style={heading}>New accounts ({waiting.accounts.length})</Text>}
      {waiting.accounts.map((p) => (
        <View key={p.id} style={card}>
          <Text style={[styles.name, { color: t.text }]}>@{p.username}</Text>
          <Text style={[styles.line, { color: t.muted }]}>
            {ROLE_LABEL[p.role]} · joined {timeAgo(p.created_at)}
          </Text>
          <Button
            title="Approve account"
            icon="checkmark"
            loading={busy === p.id}
            disabled={!!busy}
            onPress={() => run(p.id, `@${p.username} is approved and can choose a spot.`, () => setAccountStatus(p.id, 'approved'))}
          />
          <Button
            title="Reject"
            icon="close"
            variant="outline"
            disabled={!!busy}
            onPress={async () => {
              if (await confirm('Reject this account?', `@${p.username} won't be able to add a pin. You can undo this in Accounts.`, 'Reject'))
                run(p.id, `@${p.username} was rejected.`, () => setAccountStatus(p.id, 'rejected'));
            }}
          />
        </View>
      ))}

      {waiting.pins.length > 0 && <Text style={heading}>Map locations ({waiting.pins.length})</Text>}
      {waiting.pins.map((p) => (
        <View key={p.id} style={card}>
          <Avatar name={p.name} path={p.photo_path} size={84} />
          <Text style={[styles.name, { color: t.text }]}>{p.name}</Text>
          <Text style={[styles.line, { color: t.muted }]}>{KIND_LABEL[p.kind]}</Text>
          {[
            p.details?.full_name && `Full name: ${p.details.full_name}`,
            p.phone && `Phone: ${p.phone}`,
            p.details?.gcash && `GCash: ${p.details.gcash}`,
            p.address,
            p.hours,
            p.description,
            ...SERVICE_KEYS.map((k) => p.prices[k] && `${SERVICES[k]}: ${peso(p.prices[k])}`),
          ].filter(Boolean).map((line, i) => (
            <Text key={i} style={[styles.line, { color: t.text }]}>
              {line}
            </Text>
          ))}
          <Button title="Check the spot" icon="map-outline" variant="ghost" onPress={() => Linking.openURL(directionsUrl(p))} />
          <Button
            title="Approve location"
            icon="checkmark"
            loading={busy === String(p.id)}
            disabled={!!busy}
            onPress={() =>
              run(String(p.id), `${p.name} is now on the map.`, async () => {
                await patchPlace(p.id, { approved: true });
              })
            }
          />
          <Button
            title="Reject"
            icon="close"
            variant="outline"
            disabled={!!busy}
            onPress={async () => {
              if (await confirm('Reject this location?', `"${p.name}" will be deleted. The owner can send a new one.`, 'Reject'))
                run(String(p.id), `${p.name} was rejected.`, () => deletePlace(p.id));
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 64 },
  heading: { fontSize: 18, fontWeight: '800' },
  container: { padding: 16, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  name: { fontSize: 18, fontWeight: '800' },
  line: { fontSize: 15, lineHeight: 21 },
});
