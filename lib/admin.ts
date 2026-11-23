import { getWaitingPlaces } from './places';
import type { PrivateDetails } from './profile';
import { supabase } from './supabase';
import type { AccountStatus, Profile, Role } from './types';

export type Report = {
  users: number;
  vulcators: number;
  shops: number;
  pending_accounts: number;
  rejected_accounts: number;
  pending_pins: number;
  live_pins: number;
  open_now: number;
  signups: { day: string; count: number }[];
};

export const ACCOUNTS_PAGE = 30;

export async function getReport() {
  const { data, error } = await supabase.rpc('admin_report');
  if (error) throw error;
  return data as Report;
}

/** Newest accounts first. `from` is how many are already shown. */
export async function getAccounts(opts: { role?: Role; search?: string; from?: number; notId?: string }) {
  let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).order('id');
  if (opts.role) q = q.eq('role', opts.role);
  if (opts.notId) q = q.neq('id', opts.notId);
  // Usernames are letters, numbers and _ only; _ means "any character" in SQL, so escape it.
  const search = opts.search?.replace(/\W/g, '').replace(/_/g, '\\_');
  if (search) q = q.ilike('username', `%${search}%`);
  const from = opts.from ?? 0;
  const { data, error } = await q.range(from, from + ACCOUNTS_PAGE - 1).returns<Profile[]>();
  if (error) throw error;
  return data ?? [];
}

export async function setAccountStatus(id: string, status: AccountStatus) {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', id).select('id').single();
  if (error) throw error;
}

/** Accounts and pins that need a decision. Pins of accounts that aren't approved wait for the account first. */
export async function getWaiting() {
  const [profiles, pins] = await Promise.all([
    supabase.from('profiles').select('*').neq('status', 'approved').order('created_at').returns<Profile[]>(),
    getWaitingPlaces(),
  ]);
  if (profiles.error) throw profiles.error;
  const blocked = profiles.data ?? [];
  const waitingPins = pins.filter((pin) => !blocked.some((p) => p.id === pin.owner_id));
  const { data: details, error } = await supabase
    .from('private_details')
    .select('user_id, full_name, mobile, gcash')
    .in('user_id', waitingPins.map((p) => p.owner_id).filter((id) => id !== null))
    .returns<(PrivateDetails & { user_id: string })[]>();
  if (error) throw error;
  return {
    accounts: blocked.filter((p) => p.status === 'pending'),
    pins: waitingPins.map((pin) => ({ ...pin, details: details?.find((d) => d.user_id === pin.owner_id) })),
  };
}
