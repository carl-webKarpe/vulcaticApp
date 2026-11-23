import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { avatarUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

type Props = { name: string; path?: string | null; uri?: string | null; size?: number };

/** Round photo, or the first letter of the username. `uri` is a photo picked but not saved yet. */
export function Avatar({ name, path, uri, size = 36 }: Props) {
  const t = useTheme();
  const photo = uri ?? avatarUrl(path);
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
      {photo && <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden' },
  letter: { fontWeight: '800' },
});
