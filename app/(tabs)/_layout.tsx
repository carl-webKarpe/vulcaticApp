import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

function FeedTitle() {
  const t = useTheme();
  return (
    <View style={styles.titleRow}>
      <Image source={require('@/assets/images/gecko-head.png')} style={styles.titleIcon} contentFit="contain" />
      <Text style={[styles.title, { color: t.text }]}>Vulcatic</Text>
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  const { session, profile } = useAuth();
  const role = profile?.role;
  const isOwner = role === 'shop' || role === 'vulcator';

  // Owners start on their own screen.
  useEffect(() => {
    if (isOwner) router.navigate('/my-place');
  }, [isOwner]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: t.card },
        headerTitleStyle: { color: t.text, fontWeight: '800', fontSize: 18 },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: t.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Map',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Protected guard={isOwner}>
        <Tabs.Screen
          name="my-place"
          options={{
            title: role === 'shop' ? 'My shop' : 'My service',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={role === 'shop' ? (focused ? 'build' : 'build-outline') : focused ? 'bicycle' : 'bicycle-outline'}
                color={color as string}
                size={size}
              />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={!!session}>
      <Tabs.Screen
        name="feed"
        options={{
          headerTitle: () => <FeedTitle />,
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'images' : 'images-outline'} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'New post',
          tabBarLabel: 'Post',
          tabBarAccessibilityLabel: 'Share a new post',
          tabBarIcon: () => (
            <View style={[styles.shareButton, { backgroundColor: t.primary }]}>
              <Ionicons name="add" size={22} color={t.onPrimary} />
            </View>
          ),
        }}
      />
      </Tabs.Protected>
      <Tabs.Screen
        name="profile"
        options={{
          title: session ? 'Profile' : 'Account',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 30, height: 30 },
  title: { fontSize: 20, fontWeight: '800' },
  shareButton: { width: 44, height: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
