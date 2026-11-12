import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

/** A small colored message box for errors and success messages. */
export function Notice({ text, kind }: { text: string; kind: 'error' | 'success' }) {
  const t = useTheme();
  const isError = kind === 'error';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: isError ? t.dangerSoft : t.successSoft }]}
    >
      <Ionicons
        name={isError ? 'alert-circle' : 'checkmark-circle'}
        size={20}
        color={isError ? t.danger : t.success}
      />
      <Text style={[styles.text, { color: t.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
});
