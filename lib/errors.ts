/** Turns technical errors from Supabase / the network into short messages people understand. */
export function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : (e as { message?: string })?.message ?? '';
  const msg = raw.toLowerCase();

  if (msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('networkerror'))
    return 'No internet connection. Check your connection and try again.';
  if (msg.includes('invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('user already registered')) return 'An account with this email already exists. Try signing in.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox.';
  if (msg.includes('database error saving new user') || msg.includes('profiles_username_key'))
    return 'That username is already taken. Try another one.';
  if (msg.includes('unable to validate email') || msg.includes('invalid email')) return 'That email address looks wrong.';
  if (msg.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (msg.includes('new password should be different')) return 'Choose a password different from your old one.';
  if (msg.includes('for security purposes') || msg.includes('rate limit'))
    return 'Too many tries. Please wait a minute and try again.';
  if (msg.includes('payload too large') || msg.includes('maximum allowed size')) return 'That photo is too big (max 10 MB).';
  if (msg.includes('jwt expired') || msg.includes('invalid jwt')) return 'Your session expired. Please sign in again.';

  return raw || 'Something went wrong. Please try again.';
}
