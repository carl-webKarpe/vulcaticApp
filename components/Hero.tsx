import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useLoop } from '@/lib/motion';
import { useTheme, type TintName } from '@/lib/theme';

import { IslandScene } from './IslandScene';

type Props = { title?: string; text?: string; gecko?: boolean; children?: ReactNode };

/** Big colorful header card. With `gecko`, the gecko talks from the moving island scene. */
export function Hero({ title, text, gecko, children }: Props) {
  const t = useTheme();
  const bob = useLoop(1400, true);

  if (gecko)
    return (
      <View style={styles.hero}>
        <IslandScene />
        <View style={styles.row}>
          <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
            <Image source={require('@/assets/images/gecko.png')} style={styles.gecko} contentFit="contain" accessible={false} />
          </Animated.View>
          <View style={[styles.bubble, { backgroundColor: t.card }]}>
            <View style={[styles.tail, { borderRightColor: t.card }]} />
            {title && <Text style={[styles.title, { color: t.text }]}>{title}</Text>}
            {text && <Text style={[styles.text, { color: t.text }]}>{text}</Text>}
          </View>
        </View>
        {children}
      </View>
    );

  return (
    <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={[styles.circle, styles.circleBig]} />
      <View style={[styles.circle, styles.circleSmall]} />
      {title && <Text style={[styles.title, { color: t.onHero }]}>{title}</Text>}
      {text && <Text style={[styles.text, { color: t.onHero }]}>{text}</Text>}
      {children}
    </LinearGradient>
  );
}

/** Icon in a soft colored circle. */
export function IconBadge({ icon, tint, size = 44 }: { icon: keyof typeof Ionicons.glyphMap; tint: TintName; size?: number }) {
  const { bg, fg } = useTheme().tints[tint];
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Ionicons name={icon} size={size * 0.52} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, padding: 20, gap: 10, overflow: 'hidden' },
  circle: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.16)' },
  circleBig: { width: 220, height: 220, borderRadius: 110, right: -70, top: -90 },
  circleSmall: { width: 120, height: 120, borderRadius: 60, left: -40, bottom: -50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 170 },
  gecko: { width: 104, height: 156 },
  bubble: { flex: 1, borderRadius: 22, padding: 16, marginBottom: 24 },
  tail: {
    position: 'absolute',
    left: -14,
    top: '50%',
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  text: { fontSize: 16, lineHeight: 23, marginTop: 2 },
  badge: { alignItems: 'center', justifyContent: 'center' },
});
