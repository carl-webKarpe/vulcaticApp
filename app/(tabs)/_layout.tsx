import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

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
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Share a new post',
          tabBarIcon: () => (
            <View style={[styles.shareButton, { backgroundColor: t.primary }]}>
              <Ionicons name="add" size={30} color={t.onPrimary} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
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
  shareButton: { width: 52, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
});
