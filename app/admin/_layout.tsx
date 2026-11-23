import { Tabs } from 'expo-router';

import { TabIcon, tabScreenOptions } from '@/components/TabIcon';
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
      screenOptions={tabScreenOptions(t)}
    >
      {TABS.map(({ name, title, label, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarLabel: label ?? title,
            headerShown: name !== 'map',
            tabBarIcon: ({ focused }) => <TabIcon name={icon} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
