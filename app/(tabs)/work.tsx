import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bars } from '@/components/Bars';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Hero, IconBadge } from '@/components/Hero';
import { JobCard } from '@/components/JobCard';
import { Notice } from '@/components/Notice';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { friendlyError } from '@/lib/errors';
import { isOpenJob, updateJob, useJobs, type Job, type JobStatus } from '@/lib/jobs';
import { jobStats } from '@/lib/jobStats';
import { callPlace, directionsUrl, getMyPlace, getRatings, peso } from '@/lib/places';
import { useTheme, type TintName } from '@/lib/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Vulcators and shops: answer requests, move jobs along, and see earnings. */
export default function Work() {
  const t = useTheme();
  const { profile } = useAuth();
  const userId = profile?.id;
  const isShop = profile?.role === 'shop';
  const { jobs: all, error, reload } = useJobs();
  const [rating, setRating] = useState<{ stars: number; ratings: number } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // A new rating arrives as a changed job, so look again whenever the jobs change.
  useEffect(() => {
    if (!userId || !all) return;
    let active = true;
    Promise.all([getMyPlace(userId), getRatings()])
      .then(([place, ratings]) => active && setRating((place && ratings[place.id]) ?? null))
      .catch(() => {}); // the tile just shows "None yet"
    return () => {
      active = false;
    };
  }, [userId, all]);

  if (!all)
    return error ? (
      <EmptyState title="Couldn't load" message={error} actionTitle="Try again" onAction={reload} />
    ) : (
      <ActivityIndicator style={styles.loading} size="large" color={t.accent} />
    );

  const jobs = all.filter((j) => j.owner_id === userId);
  const open = jobs.filter(isOpenJob);
  const past = jobs.filter((j) => !isOpenJob(j));
  const stats = jobStats(jobs);
  const waiting = open.filter((j) => j.status === 'requested').length;

  const move = async (job: Job, status: JobStatus) => {
    setBusy(job.id);
    setMessage(null);
    try {
      await updateJob(job.id, { status });
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      await reload();
      setBusy(null);
    }
  };

  const tile = (label: string, value: string, hint: string) => (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}, ${hint}`}
      style={[styles.tile, { backgroundColor: t.card, borderColor: t.border }]}
    >
      <Text style={[styles.tileText, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.tileText, { color: t.muted }]}>{hint}</Text>
    </View>
  );

  const actions = (job: Job) => {
    const button = (title: string, icon: 'checkmark' | 'close' | 'car' | 'checkmark-done' | 'cash', status: JobStatus, main = true) => (
      <Button
        title={title}
        icon={icon}
        variant={main ? 'primary' : 'outline'}
        loading={busy === job.id && main}
        disabled={busy !== null}
        onPress={async () => {
          if (status === 'cancelled' && !(await confirm('Cancel this job?', 'The customer will be told.', 'Cancel job'))) return;
          move(job, status);
        }}
      />
    );
    const spot = job.lat !== null && job.lng !== null ? { lat: job.lat, lng: job.lng } : null;
    return (
      <>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button title="Call" icon="call" variant="outline" onPress={() => callPlace(job.phone)} />
          </View>
          {spot && (
            <View style={styles.flex}>
              <Button title="Go there" icon="navigate" variant="outline" onPress={() => Linking.openURL(directionsUrl(spot))} />
            </View>
          )}
        </View>
        {job.status === 'requested' && button('Accept', 'checkmark', 'accepted')}
        {job.status === 'requested' && button('Decline', 'close', 'declined', false)}
        {job.status === 'accepted' && spot && button("I'm on the way", 'car', 'on_the_way')}
        {(job.status === 'on_the_way' || (job.status === 'accepted' && !spot)) && button('Job done', 'checkmark-done', 'done')}
        {job.status === 'accepted' && spot && button('Job done', 'checkmark-done', 'done', false)}
        {job.status === 'done' && button(`I got paid ${peso(Number(job.price))}`, 'cash', 'paid')}
        {(job.status === 'accepted' || job.status === 'on_the_way') && button('Cancel job', 'close', 'cancelled', false)}
      </>
    );
  };

  const tip = (icon: 'sunny' | 'camera' | 'pricetag', tint: TintName, title: string, text: string, go: () => void) => (
    <Pressable
      onPress={go}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tip, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.8 }]}
    >
      <IconBadge icon={icon} tint={tint} />
      <View style={styles.flex}>
        <Text style={[styles.tipTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.tileText, { color: t.muted }]}>{text}</Text>
      </View>
    </Pressable>
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
      <Hero
        gecko
        title={waiting ? `${waiting} new ${waiting === 1 ? 'request' : 'requests'}` : open.length ? 'Job in progress' : 'No open jobs'}
        text={waiting ? 'A customer is waiting for your answer.' : 'Keep the app open to see new requests.'}
      />
      {(message ?? error) && <Notice kind="error" text={(message ?? error)!} />}

      {open.map((job) => (
        <JobCard key={job.id} job={job} forOwner>
          {actions(job)}
        </JobCard>
      ))}

      <View style={styles.tiles}>
        {tile('Earned today', peso(stats.today.total), `${stats.today.count} paid ${stats.today.count === 1 ? 'job' : 'jobs'}`)}
        {tile('Last 7 days', peso(stats.week.total), `${stats.week.count} paid ${stats.week.count === 1 ? 'job' : 'jobs'}`)}
        {tile('Acceptance', stats.acceptance === null ? 'None yet' : `${stats.acceptance}%`, `${stats.answered} answered · 30 days`)}
        {tile('Your rating', rating ? `${rating.stars} ★` : 'None yet', `${rating?.ratings ?? 0} ${rating?.ratings === 1 ? 'rating' : 'ratings'}`)}
      </View>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[styles.heading, { color: t.text }]}>Earnings, last 7 days</Text>
        <Bars
          format={peso}
          rows={stats.perDay.map((d, i) => ({ label: i === 6 ? 'Today' : `${DAYS[d.day.getDay()]} ${d.day.getDate()}`, value: d.total }))}
        />
      </View>

      <Text style={[styles.heading, { color: t.text }]}>{past.length ? 'Recent jobs' : 'Get more customers'}</Text>
      {past.slice(0, 20).map((job) => (
        <JobCard key={job.id} job={job} forOwner />
      ))}
      {past.length === 0 && (
        <>
          {tip('sunny', 'amber', isShop ? 'Switch to Open' : 'Switch to Available', 'Customers can only send requests while you are on.', () =>
            router.navigate('/my-place'),
          )}
          {tip('pricetag', 'blue', 'Add your prices', 'Customers need a price to send a request.', () => router.navigate('/my-place'))}
          {tip('camera', 'coral', 'Add your photo', 'People trust a face more than an empty pin.', () => router.push('/edit-profile'))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 64 },
  container: { padding: 16, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexGrow: 1, flexBasis: '44%', borderRadius: 20, borderWidth: 1, padding: 14, gap: 2 },
  tileValue: { fontSize: 24, fontWeight: '800' },
  tileText: { fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
  heading: { fontSize: 18, fontWeight: '800' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, padding: 16 },
  tipTitle: { fontSize: 16, fontWeight: '800' },
});
