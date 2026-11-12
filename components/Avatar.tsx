import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

/** Round avatar with the first letter of the username. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.accentSoft, borderColor: t.accent },
      ]}
    >
      <Text style={[styles.letter, { color: t.accent, fontSize: size * 0.42 }]}>
        {(name.charAt(0) || '?').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  letter: { fontWeight: '800' },
});
