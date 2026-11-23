import type { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

import { Button } from './Button';

type Props = {
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
  /** Not shown in this design: the gecko is used instead. */
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Friendly screen with the gecko, for "nothing here yet" and "something went wrong". */
export function EmptyState({ title, message, actionTitle, onAction }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.glow, { backgroundColor: t.accentSoft }]}>
        <Image source={require('@/assets/images/gecko.png')} style={styles.gecko} contentFit="contain" />
      </View>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <Text style={[styles.message, { color: t.muted }]}>{message}</Text>
      {actionTitle && onAction && (
        <View style={styles.action}>
          <Button title={actionTitle} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  glow: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gecko: { width: 110, height: 165 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  action: { marginTop: 12, minWidth: 180 },
});
