import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/lib/theme';

const TABS: { name: string; title: string; label?: string; icon: 'grid' | 'checkmark-done' | 'people' | 'map' | 'person' }[] = [
  { name: 'index', title: 'Admin dashboard', label: 'Dashboard', icon: 'grid' },
  { name: 'approvals', title: 'Approvals', icon: 'checkmark-done' },
  { name: 'accounts', title: 'Accounts', icon: 'people' },
  { name: 'map', title: 'Map', icon: 'map' },
  { name: 'me', title: 'My account', label: 'Me', icon: 'person' },
];

/** Admins get their own screens instead of the customer and owner ones. */
export default function AdminLayout() {
  const t = useTheme();
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
      {TABS.map(({ name, title, label, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarLabel: label ?? title,
            headerShown: name !== 'map',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? icon : `${icon}-outline`} color={color as string} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
