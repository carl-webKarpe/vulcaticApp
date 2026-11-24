import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import { friendlyError } from './errors';
import { haptic } from './haptics';
import type { ServiceKey } from './places';
import { supabase } from './supabase';

export type JobStatus = 'requested' | 'accepted' | 'on_the_way' | 'done' | 'paid' | 'declined' | 'cancelled';

export const VEHICLES = { motorcycle: 'Motorcycle', tricycle: 'Tricycle', car: 'Car', van: 'Van' };
export type Vehicle = keyof typeof VEHICLES;

export const JOB_STATUS: Record<JobStatus, string> = {
  requested: 'Waiting for an answer',
  accepted: 'Accepted',
  on_the_way: 'On the way',
  done: 'Done, waiting for payment',
  paid: 'Paid',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export const isOpenJob = (j: Pick<Job, 'status'>) => ['requested', 'accepted', 'on_the_way', 'done'].includes(j.status);

export type Job = {
  id: number;
  customer_id: string;
  owner_id: string;
  place_id: number | null;
  place_name: string;
  place_phone: string | null;
  service: ServiceKey;
  price: number;
  vehicle: Vehicle;
  phone: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  status: JobStatus;
  rating: number | null;
  created_at: string;
  responded_at: string | null;
  done_at: string | null;
  paid_at: string | null;
  customer: { username: string; avatar_url: string | null } | null;
};

type JobsState = { jobs: Job[] | null; error: string | null; reload: () => Promise<void> };

const JobsContext = createContext<JobsState>({ jobs: null, error: null, reload: async () => {} });
export const useJobs = () => useContext(JobsContext);

/** The signed-in person's jobs (sent by a customer, or received by an owner), kept up to date while the app is open. */
export function JobsProvider({ children }: { children: ReactNode }) {
  const { session, isAdmin } = useAuth();
  const userId = isAdmin ? undefined : session?.user.id;
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const waiting = useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    // shortcut: newest 200 jobs only, add paging when an owner passes 200 in a month.
    const { data, error: e } = await supabase
      .from('jobs')
      .select('*, customer:profiles!jobs_customer_id_fkey(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<Job[]>();
    if (e) return setError(friendlyError(e));
    setError(null);
    setJobs(data ?? []);
    const count = (data ?? []).filter((j) => j.owner_id === userId && j.status === 'requested').length;
    if (waiting.current !== null && count > waiting.current) haptic.success(); // a new request came in
    waiting.current = count;
  }, [userId]);

  useEffect(() => {
    setJobs(null);
    setError(null);
    waiting.current = null;
    if (!userId) return;
    reload();
    const channel = supabase
      .channel(`jobs-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => reload())
      .subscribe();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => {
      supabase.removeChannel(channel);
      sub.remove();
    };
  }, [userId, reload]);

  return <JobsContext.Provider value={{ jobs, error, reload }}>{children}</JobsContext.Provider>;
}

export type JobInput = {
  place_id: number;
  service: ServiceKey;
  vehicle: Vehicle;
  phone: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
};

export async function sendRequest(input: JobInput) {
  const { error } = await supabase.from('jobs').insert(input).select('id').single();
  if (error?.message.includes('jobs_one_open_per_customer'))
    throw new Error('You already have an open request. Cancel it first in Requests.');
  if (error) throw error;
}

/** The database decides which moves are allowed for whom. */
export async function updateJob(id: number, patch: { status: JobStatus } | { rating: number }) {
  const { error } = await supabase.from('jobs').update(patch).eq('id', id).select('id').single();
  if (error) throw error;
}

/** Only answers after the request was accepted. */
export async function getJobGcash(id: number) {
  const { data, error } = await supabase.rpc('job_gcash', { job: id });
  if (error) throw error;
  return data as string | null;
}
