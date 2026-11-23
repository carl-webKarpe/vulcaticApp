import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useLoop } from '@/lib/motion';
import { useTheme } from '@/lib/theme';

const BUMP = 64; // width of one wave

function Cloud({ width, top, duration, scale }: { width: number; top: `${number}%`; duration: number; scale: number }) {
  const drift = useLoop(duration, true);
  return (
    <Animated.View
      style={[
        styles.cloud,
        {
          top,
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [width * 0.08, width * 0.62] }) },
            { scale },
          ],
        },
      ]}
    >
      <View style={[styles.puff, { width: 44, height: 44, left: 8 }]} />
      <View style={[styles.puff, { width: 58, height: 58, left: 34, bottom: 0 }]} />
      <View style={[styles.puff, { width: 40, height: 40, left: 76 }]} />
      <View style={[styles.puff, { width: 110, height: 26, left: 8 }]} />
    </Animated.View>
  );
}

function Waves({ width, color, bottom, duration }: { width: number; color: string; bottom: `${number}%`; duration: number }) {
  const move = useLoop(duration);
  return (
    <Animated.View
      style={[styles.waves, { bottom, transform: [{ translateX: move.interpolate({ inputRange: [0, 1], outputRange: [-BUMP, 0] }) }] }]}
    >
      {Array.from({ length: Math.ceil(width / BUMP) + 2 }, (_, i) => (
        <View key={i} style={[styles.bump, { backgroundColor: color }]} />
      ))}
    </Animated.View>
  );
}

/** Moving background: sun, drifting clouds, Siargao island and rolling waves. Decoration only. */
export function IslandScene() {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const glow = useLoop(2400, true);
  const bob = useLoop(3200, true);

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.scene]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <LinearGradient colors={t.sky} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.sun,
          { backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1.9] }) }] },
        ]}
      />
      <View style={[styles.sun, { backgroundColor: t.sun }]} />
      {width > 0 && (
        <>
          <Cloud width={width} top="8%" duration={16000} scale={0.9} />
          <Cloud width={width} top="30%" duration={23000} scale={0.6} />
          <Animated.View
            style={[styles.island, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }] }]}
          >
            <Image source={require('@/assets/images/island.svg')} style={StyleSheet.absoluteFill} contentFit="contain" />
          </Animated.View>
          <Waves width={width} color={t.sea[0]} bottom="24%" duration={4200} />
          <View style={[styles.sea, { height: '26%', backgroundColor: t.sea[0] }]} />
          <Waves width={width} color={t.sea[1]} bottom="10%" duration={3000} />
          <View style={[styles.sea, { height: '12%', backgroundColor: t.sea[1] }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { overflow: 'hidden' },
  sun: { position: 'absolute', width: 54, height: 54, borderRadius: 27, right: 26, top: 22 },
  cloud: { position: 'absolute', left: 0, width: 126, height: 60 },
  puff: { position: 'absolute', bottom: 0, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.9)' },
  island: { position: 'absolute', right: 4, bottom: '20%', width: 150, height: 116 },
  waves: { position: 'absolute', left: -BUMP, flexDirection: 'row', height: 26 },
  bump: { width: BUMP, height: 26, borderTopLeftRadius: BUMP / 2, borderTopRightRadius: BUMP / 2 },
  sea: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
