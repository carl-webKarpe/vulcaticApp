import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/lib/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
};

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: Props) {
  const t = useTheme();
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? { backgroundColor: t.primary }
          : { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border },
        (pressed || inactive) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? t.primaryText : t.text} />
      ) : (
        <Text style={[styles.text, { color: isPrimary ? t.primaryText : t.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  text: { fontSize: 16, fontWeight: '600' },
});
