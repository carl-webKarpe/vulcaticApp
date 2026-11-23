import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TabIcon, tabScreenOptions } from '@/components/TabIcon';
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
      screenOptions={tabScreenOptions(t)}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} />,
        }}
      />
      <Tabs.Protected guard={isOwner}>
        <Tabs.Screen
          name="my-place"
          options={{
            title: role === 'shop' ? 'My shop' : 'My service',
            tabBarIcon: ({ focused }) => <TabIcon name={role === 'shop' ? 'build' : 'bicycle'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="work"
          options={{
            title: 'Work',
            tabBarIcon: ({ focused }) => <TabIcon name="briefcase" focused={focused} />,
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={!!session}>
      <Tabs.Screen
        name="feed"
        options={{
          headerTitle: () => <FeedTitle />,
          headerRight: () => (
            <Pressable
              onPress={() => router.navigate('/new')}
              accessibilityRole="button"
              accessibilityLabel="Share a new post"
              style={({ pressed }) => [styles.postButton, { backgroundColor: t.sun }, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="add" size={20} color={t.onSun} />
              <Text style={{ color: t.onSun, fontWeight: '800', fontSize: 15 }}>Post</Text>
            </Pressable>
          ),
          tabBarLabel: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon name="images" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'New post',
          href: null, // opened from the Post button in the feed
        }}
      />
      </Tabs.Protected>
      <Tabs.Screen
        name="profile"
        options={{
          title: session ? 'Profile' : 'Account',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 30, height: 30 },
  title: { fontSize: 20, fontWeight: '800' },
  postButton: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 14, borderRadius: 22, marginRight: 12 },
});
