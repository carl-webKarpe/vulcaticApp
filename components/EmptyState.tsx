import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

import { Button } from './Button';

type Props = {
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
};

/** Friendly screen with the gecko, for "nothing here yet" and "something went wrong". */
export function EmptyState({ title, message, actionTitle, onAction }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <Image source={require('@/assets/images/gecko.png')} style={styles.gecko} contentFit="contain" />
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
  gecko: { width: 120, height: 180, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  action: { marginTop: 12, minWidth: 180 },
});
