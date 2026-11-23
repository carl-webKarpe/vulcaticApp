import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Notice } from '@/components/Notice';
import { TextField, type TextFieldRef } from '@/components/TextField';
import { resetPasswordRedirect, useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { Role } from '@/lib/types';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

const TITLES: Record<Mode, { title: string; subtitle: string; button: string }> = {
  'sign-in': { title: 'Welcome back!', subtitle: 'Sign in to your Vulcatic account.', button: 'Sign in' },
  'sign-up': { title: 'Join Vulcatic', subtitle: 'Choose what fits you.', button: 'Create account' },
  forgot: { title: 'Forgot password?', subtitle: "Enter your email and we'll send you a reset link.", button: 'Send reset link' },
};

const ROLES: { role: Role; icon: keyof typeof Ionicons.glyphMap; title: string; hint: string }[] = [
  { role: 'user', icon: 'person', title: 'I need help', hint: 'Find someone to fix my tire' },
  { role: 'vulcator', icon: 'bicycle', title: 'I fix tires on the road', hint: 'I go to the customer' },
  { role: 'shop', icon: 'build', title: 'I own a shop', hint: 'Customers come to me' },
];

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const t = useTheme();
  const { linkError, clearLinkError } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);
  const emailRef = useRef<TextFieldRef>(null);
  const passwordRef = useRef<TextFieldRef>(null);

  const copy = TITLES[mode];
  const shownMessage = message ?? (linkError ? { text: `That link didn't work: ${linkError}`, kind: 'error' as const } : null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
    clearLinkError();
  };

  const validate = (): string | null => {
    if (mode === 'sign-up' && !USERNAME_RE.test(username)) return 'Username must be 3–20 letters, numbers or _.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    if (mode !== 'forgot' && password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  const submit = async () => {
    clearLinkError();
    const problem = validate();
    if (problem) {
      setMessage({ text: problem, kind: 'error' });
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username, role } },
        });
        if (error) throw error;
        if (!data.session)
          setMessage({ text: 'Account created! Check your email to confirm it, then sign in.', kind: 'success' });
      } else if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: resetPasswordRedirect(),
        });
        if (error) throw error;
        setMessage({
          text: 'Check your email! Open the link on this phone to choose a new password.',
          kind: 'success',
        });
      }
    } catch (e) {
      setMessage({ text: friendlyError(e), kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.hero}>
              <View style={[styles.glow, { backgroundColor: t.accentSoft }]} />
              <Image
                source={require('@/assets/images/gecko.png')}
                style={styles.gecko}
                contentFit="contain"
                accessibilityLabel="Vulcatic gecko waving"
              />
            </View>
            <Text style={[styles.brand, { color: t.accent }]}>Vulcatic</Text>
            <Text style={[styles.title, { color: t.text }]}>{copy.title}</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>{copy.subtitle}</Text>

            <View style={styles.form}>
              {mode === 'sign-up' && (
                <View style={styles.roles} accessibilityRole="radiogroup">
                  {ROLES.map((r) => {
                    const active = role === r.role;
                    return (
                      <Pressable
                        key={r.role}
                        onPress={() => setRole(r.role)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={({ pressed }) => [
                          styles.role,
                          { borderColor: active ? t.accent : t.border, backgroundColor: active ? t.accentSoft : t.card },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Ionicons name={r.icon} size={26} color={active ? t.accent : t.muted} />
                        <View style={styles.flex}>
                          <Text style={[styles.roleTitle, { color: t.text }]}>{r.title}</Text>
                          <Text style={{ color: active ? t.text : t.muted, fontSize: 14 }}>{r.hint}</Text>
                        </View>
                        <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? t.accent : t.muted} />
                      </Pressable>
                    );
                  })}
                  {role !== 'user' && (
                    <Text style={{ color: t.muted, fontSize: 14, lineHeight: 20 }}>An admin will check your account before you can go on the map.</Text>
                  )}
                </View>
              )}
              {mode === 'sign-up' && (
                <TextField
                  label="Username"
                  icon="at"
                  placeholder="gecko_fan"
                  value={username}
                  onChangeText={(v) => setUsername(v.replace(/\s/g, ''))}
                  maxLength={20}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  hint="3–20 letters, numbers or _"
                />
              )}
              <TextField
                ref={emailRef}
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                returnKeyType={mode === 'forgot' ? 'send' : 'next'}
                onSubmitEditing={() => (mode === 'forgot' ? submit() : passwordRef.current?.focus())}
              />
              {mode !== 'forgot' && (
                <TextField
                  ref={passwordRef}
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder={mode === 'sign-up' ? 'At least 6 characters' : 'Your password'}
                  password
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
              )}

              {mode === 'sign-in' && (
                <Pressable onPress={() => switchMode('forgot')} hitSlop={8} style={styles.forgot}>
                  <Text style={{ color: t.accent, fontWeight: '600' }}>Forgot password?</Text>
                </Pressable>
              )}

              {shownMessage && <Notice text={shownMessage.text} kind={shownMessage.kind} />}

              <Button title={copy.button} onPress={submit} loading={loading} />
            </View>

            <View style={styles.switchRow}>
              {mode === 'forgot' ? (
                <Pressable onPress={() => switchMode('sign-in')} hitSlop={8}>
                  <Text style={{ color: t.accent, fontWeight: '700' }}>← Back to sign in</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} hitSlop={8}>
                  <Text style={{ color: t.muted, fontSize: 15 }}>
                    {mode === 'sign-in' ? 'New here? ' : 'Already have an account? '}
                    <Text style={{ color: t.accent, fontWeight: '700' }}>
                      {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
                    </Text>
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.switchRow}>
              <Button title="Continue without an account" variant="ghost" icon="map-outline" onPress={() => router.replace('/')} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  container: { padding: 24, width: '100%', maxWidth: 420, alignSelf: 'center' },
  hero: { alignItems: 'center', justifyContent: 'center', height: 170, marginBottom: 4 },
  glow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: 0 },
  gecko: { width: 120, height: 170 },
  brand: { fontSize: 15, fontWeight: '800', textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  subtitle: { textAlign: 'center', marginTop: 6, fontSize: 15, lineHeight: 21 },
  form: { gap: 14, marginTop: 24 },
  roles: { gap: 10 },
  role: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 16, padding: 14, minHeight: 64 },
  roleTitle: { fontSize: 16, fontWeight: '800' },
  forgot: { alignSelf: 'flex-end', marginTop: -4 },
  switchRow: { alignItems: 'center', marginTop: 20 },
});
