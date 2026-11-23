import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { confirm } from '@/lib/confirm';
import { friendlyError } from '@/lib/errors';
import { deletePlace, directionsUrl, getWaitingPlaces, KIND_LABEL, patchPlace, type Place } from '@/lib/places';
import { useTheme } from '@/lib/theme';

/** Admins: approve or reject new shops and Vulcators. The database enforces who may do this. */
export default function Approvals() {
  const t = useTheme();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getWaitingPlaces()
      .then(setPlaces)
      .catch((e) => setError(friendlyError(e)));
  }, []);
  useEffect(load, [load]);

  const decide = async (p: Place, approve: boolean) => {
    if (!approve && !(await confirm('Reject this listing?', `"${p.name}" will be deleted.`, 'Reject'))) return;
    setBusyId(p.id);
    setError(null);
    try {
      if (approve) await patchPlace(p.id, { approved: true });
      else await deletePlace(p.id);
      setPlaces((cur) => (cur ?? []).filter((x) => x.id !== p.id));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FlatList
      data={places ?? []}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={styles.container}
      ListHeaderComponent={error ? <Notice kind="error" text={error} /> : undefined}
      ListEmptyComponent={
        places ? (
          <EmptyState title="All done" message="No one is waiting for approval." actionTitle="Check again" onAction={load} />
        ) : error ? (
          <Button title="Try again" onPress={load} />
        ) : (
          <ActivityIndicator size="large" color={t.accent} />
        )
      }
      renderItem={({ item: p }) => (
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.name, { color: t.text }]}>{p.name}</Text>
          <Text style={[styles.line, { color: t.muted }]}>{KIND_LABEL[p.kind]}</Text>
          {[p.phone, p.address, p.hours, p.description].filter(Boolean).map((line, i) => (
            <Text key={i} style={[styles.line, { color: t.text }]}>
              {line}
            </Text>
          ))}
          <Button title="See the spot" icon="map-outline" variant="ghost" onPress={() => Linking.openURL(directionsUrl(p))} />
          <Button title="Approve" icon="checkmark" onPress={() => decide(p, true)} loading={busyId === p.id} disabled={busyId !== null} />
          <Button title="Reject" icon="close" variant="outline" onPress={() => decide(p, false)} disabled={busyId !== null} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  name: { fontSize: 18, fontWeight: '800' },
  line: { fontSize: 15, lineHeight: 21 },
});
