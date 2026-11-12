import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  /** True after opening a "reset password" email link, until a new password is saved. */
  recovering: boolean;
  /** Error from an email link (e.g. the link expired). */
  linkError: string | null;
  finishRecovery: () => void;
  clearLinkError: () => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
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
        loading,
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
