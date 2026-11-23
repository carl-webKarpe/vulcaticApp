import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Intro } from '@/components/Intro';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PendingPostsProvider } from '@/lib/pending';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

// Keep the gecko splash screen visible until we know if the user is signed in.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { session, isAdmin, loading, recovering } = useAuth();
  const t = useTheme();

  useEffect(() => {
    if (!loading || !isSupabaseConfigured) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (!isSupabaseConfigured) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <EmptyState
          title="Supabase is not set up yet"
          message="Copy .env.example to .env, add your Supabase URL and key, then restart the app."
        />
      </View>
    );
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: t.background }} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.background } }}>
      <Stack.Protected guard={!recovering && !isAdmin}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!recovering && isAdmin}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !recovering}>
        <Stack.Screen
          name="edit-profile"
          options={{
            title: 'Edit profile',
            headerShown: true,
            headerStyle: { backgroundColor: t.card },
            headerTitleStyle: { color: t.text, fontWeight: '800' },
            headerTintColor: t.accent,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="change-password"
          options={{
            title: 'Change password',
            headerShown: true,
            headerStyle: { backgroundColor: t.card },
            headerTitleStyle: { color: t.text, fontWeight: '800' },
            headerTintColor: t.accent,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="place-form"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerStyle: { backgroundColor: t.card },
            headerTitleStyle: { color: t.text, fontWeight: '800' },
            headerTintColor: t.accent,
            headerShadowVisible: false,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!!session && recovering}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

/** Waits until the splash screen is gone, so no one misses the start. */
function OpeningIntro() {
  const { loading } = useAuth();
  return <Intro play={!loading || !isSupabaseConfigured} />;
}

export default function RootLayout() {
  const t = useTheme();
  return (
    <AuthProvider>
      <PendingPostsProvider>
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
        <OpeningIntro />
      </PendingPostsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
