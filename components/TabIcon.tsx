import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme, type Theme } from '@/lib/theme';

type Outlined = 'map' | 'build' | 'bicycle' | 'briefcase' | 'images' | 'person' | 'grid' | 'checkmark-done' | 'people';

/** Tab icon: filled inside a soft pill when it is the open tab. */
export function TabIcon({ name, focused }: { name: Outlined; focused: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.pill, focused && { backgroundColor: t.accentSoft }]}>
      <Ionicons name={focused ? name : `${name}-outline`} size={23} color={focused ? t.accent : t.muted} />
    </View>
  );
}

/** Same look for the customer/owner tabs and the admin tabs. */
export const tabScreenOptions = (t: Theme) => ({
  tabBarActiveTintColor: t.accent,
  tabBarInactiveTintColor: t.muted,
  tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border, height: 72, paddingTop: 8 },
  tabBarLabelStyle: { fontSize: 12, fontWeight: '700' as const, marginTop: 2 },
  headerStyle: { backgroundColor: t.background },
  headerTitleStyle: { color: t.text, fontWeight: '800' as const, fontSize: 20 },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  sceneStyle: { backgroundColor: t.background },
});

const styles = StyleSheet.create({
  pill: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
