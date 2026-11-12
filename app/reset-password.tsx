import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Notice } from '@/components/Notice';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

/** Shown after opening the "reset password" link from the email. */
export default function ResetPassword() {
  const t = useTheme();
  const { finishRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError("The two passwords don't match.");
    setError(null);
    setLoading(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (e) {
      setError(friendlyError(e));
      return;
    }
    haptic.success();
    finishRecovery();
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <Text style={[styles.title, { color: t.text }]}>Choose a new password</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>Make it at least 6 characters.</Text>
            <View style={styles.form}>
              <TextField
                label="New password"
                icon="lock-closed-outline"
                password
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
              />
              <TextField
                label="Repeat new password"
                icon="lock-closed-outline"
                password
                value={confirm}
                onChangeText={setConfirm}
                onSubmitEditing={save}
              />
              {error && <Notice kind="error" text={error} />}
              <Button title="Save new password" onPress={save} loading={loading} />
              <Pressable onPress={() => supabase.auth.signOut()} style={styles.cancel} hitSlop={8}>
                <Text style={{ color: t.muted }}>Cancel</Text>
              </Pressable>
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
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 6, fontSize: 15 },
  form: { gap: 14, marginTop: 24 },
  cancel: { alignSelf: 'center', marginTop: 4 },
});
