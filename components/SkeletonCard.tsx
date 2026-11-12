import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme';

/** Grey placeholder that looks like a post, shown while posts are loading. */
export function SkeletonCard() {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const block = { backgroundColor: t.skeleton };
  return (
    <Animated.View
      style={[styles.card, { backgroundColor: t.card, borderColor: t.border, opacity: pulse }]}
      accessibilityLabel="Loading post"
    >
      <View style={styles.header}>
        <View style={[styles.avatar, block]} />
        <View style={{ gap: 6 }}>
          <View style={[styles.line, block, { width: 110 }]} />
          <View style={[styles.line, block, { width: 60, height: 10 }]} />
        </View>
      </View>
      <View style={[styles.image, block]} />
      <View style={styles.footer}>
        <View style={[styles.line, block, { width: '80%' }]} />
        <View style={[styles.line, block, { width: '45%' }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  line: { height: 12, borderRadius: 6 },
  image: { width: '100%', aspectRatio: 1 },
  footer: { padding: 14, gap: 8 },
});
