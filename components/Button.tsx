import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** sun = the one most important action on a screen. */
  variant?: 'primary' | 'sun' | 'light' | 'outline' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: Props) {
  const t = useTheme();
  const inactive = disabled || loading;
  const color = variant === 'primary' ? t.onPrimary : variant === 'sun' ? t.onSun : variant === 'light' ? '#0A1F44' : variant === 'ghost' ? t.accent : t.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: t.primary },
        variant === 'sun' && { backgroundColor: t.sun },
        // White button for the deep blue and emerald headers, the same in light and dark mode.
        variant === 'light' && { backgroundColor: '#FFFFFF' },
        variant === 'outline' && { borderWidth: 1.5, borderColor: t.border, backgroundColor: t.card },
        disabled && !loading && { opacity: 0.45 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={20} color={color} />}
          <Text style={[styles.text, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, fontWeight: '800' },
});
