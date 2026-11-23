import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  /** The signed-in person's profile (null while loading or signed out). */
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  /** Loads the profile again, e.g. to see if the account was approved. */
  refreshProfile: () => Promise<void>;
  /** True after opening a "reset password" email link, until a new password is saved. */
  recovering: boolean;
  /** Error from an email link (e.g. the link expired). */
  linkError: string | null;
  finishRecovery: () => void;
  clearLinkError: () => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  isAdmin: false,
  refreshProfile: async () => {},
  loading: true,
  recovering: false,
  linkError: null,
  finishRecovery: () => {},
  clearLinkError: () => {},
});

/** Where the password-reset email link sends people back to (this app). */
export const resetPasswordRedirect = () => Linking.createURL('reset-password');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<{ profile: Profile; isAdmin: boolean } | null>(null);
  // Which user's profile we finished trying to load, so admins never see the customer screens flash by.
  const [checkedId, setCheckedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const url = Linking.useURL();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const fetchAccount = useCallback(async () => {
    const [p, a] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId!).single<Profile>(),
      supabase.from('admins').select('user_id').eq('user_id', userId!).maybeSingle(),
    ]);
    if (p.error) throw p.error;
    if (a.error) throw a.error;
    return { profile: p.data, isAdmin: !!a.data };
  }, [userId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setAccount(null);
    const load = () =>
      fetchAccount()
        .then((next) => active && setAccount(next))
        .catch(() => {
          if (active) timer = setTimeout(load, 5000); // no internet: keep trying
        })
        .finally(() => active && setCheckedId(userId!));
    if (userId) load();
    else setCheckedId(null);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userId, fetchAccount]);

  const refreshProfile = useCallback(async () => setAccount(await fetchAccount()), [fetchAccount]);

  // Handle links from Supabase emails, e.g. vulcatic://reset-password#access_token=...&type=recovery
  useEffect(() => {
    if (!url || !url.includes('#')) return;
    const params = new URLSearchParams(url.split('#')[1]);
    const error = params.get('error_description');
    if (error) {
      setLinkError(error.replace(/\+/g, ' '));
      return;
    }
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;
    if (params.get('type') === 'recovery') setRecovering(true);
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error: e }) => {
      if (e) {
        setRecovering(false);
        setLinkError(e.message);
      }
    });
  }, [url]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile: account?.profile ?? null,
        isAdmin: account?.isAdmin ?? false,
        refreshProfile,
        loading: loading || (!!userId && checkedId !== userId),
        recovering,
        linkError,
        finishRecovery: () => setRecovering(false),
        clearLinkError: () => setLinkError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
