import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

export default function SignIn() {
  const t = useTheme();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const isSignUp = mode === 'sign-up';

  const submit = async () => {
    setMessage(null);
    if (isSignUp && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setMessage({ text: 'Username must be 3–20 letters, numbers or _', error: true });
      return;
    }
    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username } },
      });
      if (error) setMessage({ text: error.message, error: true });
      else if (!data.session)
        setMessage({ text: 'Account created! Check your email to confirm it, then sign in.', error: false });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage({ text: error.message, error: true });
    }
    setLoading(false);
  };

  const inputStyle = [styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={[styles.logo, { color: t.primary }]}>Vulcatic</Text>
          <Text style={[styles.subtitle, { color: t.muted }]}>
            {isSignUp ? 'Create your account' : 'Share moments with your people'}
          </Text>

          {isSignUp && (
            <TextInput
              style={inputStyle}
              placeholder="Username"
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          )}
          <TextInput
            style={inputStyle}
            placeholder="Email"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={inputStyle}
            placeholder="Password (6+ characters)"
            placeholderTextColor={t.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />

          {message && <Text style={{ color: message.error ? t.danger : t.muted }}>{message.text}</Text>}

          <Button
            title={isSignUp ? 'Sign up' : 'Sign in'}
            onPress={submit}
            loading={loading}
            disabled={!email || password.length < 6}
          />

          <Pressable
            onPress={() => {
              setMode(isSignUp ? 'sign-in' : 'sign-up');
              setMessage(null);
            }}
          >
            <Text style={[styles.switch, { color: t.muted }]}>
              {isSignUp ? 'Already have an account? ' : 'New here? '}
              <Text style={{ color: t.primary, fontWeight: '600' }}>{isSignUp ? 'Sign in' : 'Create an account'}</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
  logo: { fontSize: 40, fontWeight: '800', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 16, fontSize: 15 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  switch: { textAlign: 'center', marginTop: 8 },
});
