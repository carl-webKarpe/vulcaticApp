import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { JobCard } from '@/components/JobCard';
import { Notice } from '@/components/Notice';
import { confirm } from '@/lib/confirm';
import { friendlyError } from '@/lib/errors';
import { getJobGcash, updateJob, useJobs, type Job } from '@/lib/jobs';
import { callPlace } from '@/lib/places';
import { useTheme } from '@/lib/theme';

/** The customer's requests: follow the open one, pay, and rate. */
export default function Requests() {
  const t = useTheme();
  const { jobs, error, reload } = useJobs();
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [gcash, setGcash] = useState<{ id: number; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const run = async (job: Job, action: () => Promise<void>) => {
    setBusy(job.id);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      await reload();
      setBusy(null);
    }
  };

  if (!jobs)
    return error ? (
      <EmptyState title="Couldn't load" message={error} actionTitle="Try again" onAction={reload} />
    ) : (
      <ActivityIndicator style={styles.loading} size="large" color={t.accent} />
    );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={t.accent}
          colors={[t.primary]}
          onRefresh={async () => {
            setRefreshing(true);
            await reload();
            setRefreshing(false);
          }}
        />
      }
    >
      {(message ?? error) && <Notice kind="error" text={(message ?? error)!} />}
      {jobs.length === 0 && (
        <EmptyState
          title="No requests yet"
          message="Choose someone who is open on the map and tap Request."
          actionTitle="Open the map"
          onAction={() => router.navigate('/')}
        />
      )}
      {jobs.map((job) => {
        const accepted = ['accepted', 'on_the_way', 'done'].includes(job.status);
        return (
          <JobCard key={job.id} job={job}>
            {accepted && job.place_phone && <Button title="Call" icon="call" onPress={() => callPlace(job.place_phone)} />}
            {accepted && gcash?.id === job.id && <Text style={[styles.gcash, { color: t.text }]}>{gcash.text}</Text>}
            {accepted && gcash?.id !== job.id && (
              <Button
                title="Show GCash number"
                icon="wallet-outline"
                variant="outline"
                disabled={busy !== null}
                onPress={() =>
                  run(job, async () => {
                    const number = await getJobGcash(job.id);
                    setGcash({ id: job.id, text: number ? `GCash: ${number}` : 'No GCash number. Please pay by cash.' });
                  })
                }
              />
            )}
            {(job.status === 'requested' || job.status === 'accepted') && (
              <Button
                title="Cancel request"
                icon="close"
                variant="outline"
                loading={busy === job.id}
                disabled={busy !== null}
                onPress={async () => {
                  if (await confirm('Cancel this request?', `${job.place_name} will be told.`, 'Cancel request'))
                    run(job, () => updateJob(job.id, { status: 'cancelled' }));
                }}
              />
            )}
            {(job.status === 'done' || job.status === 'paid') && !job.rating && (
              <View>
                <Text style={[styles.rate, { color: t.text }]}>How was it?</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      disabled={busy !== null}
                      onPress={async () => {
                        if (await confirm(`Give ${n} of 5 stars?`, "You can't change it later.", 'Send'))
                          run(job, () => updateJob(job.id, { rating: n }));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${n} of 5 stars`}
                      style={styles.star}
                    >
                      <Ionicons name="star-outline" size={32} color={t.tints.amber.fg} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </JobCard>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 64 },
  container: { padding: 16, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  gcash: { fontSize: 18, fontWeight: '800', textAlign: 'center', paddingVertical: 6 },
  rate: { fontSize: 16, fontWeight: '800' },
  stars: { flexDirection: 'row' },
  star: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
