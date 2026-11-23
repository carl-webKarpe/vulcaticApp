import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/lib/theme';

import { IslandScene } from './IslandScene';

const native = Platform.OS !== 'web';

/** Plays once each time the app is opened (about 2.5 seconds). The app loads underneath; tap to skip. */
export function Intro({ play }: { play: boolean }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [done, setDone] = useState(false);
  const roll = useRef(new Animated.Value(0)).current;
  const gecko = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!play) return;
    let active = true;
    const to = (value: Animated.Value, toValue: number, duration: number, delay = 0) =>
      Animated.timing(value, { toValue, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native });

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((calm) => {
        if (!active) return;
        if (calm) [roll, gecko, words].forEach((v) => v.setValue(1));
        Animated.sequence([
          ...(calm
            ? []
            : [
                to(roll, 1, 800),
                Animated.parallel([
                  // Not a spring: springs settle slowly and would hold people at the intro.
                  Animated.timing(gecko, { toValue: 1, duration: 550, easing: Easing.out(Easing.back(1.8)), useNativeDriver: native }),
                  to(words, 1, 400, 200),
                ]),
              ]),
          to(cover, 0, 300, calm ? 700 : 500),
        ]).start(() => active && setDone(true));
      });
    return () => {
      active = false;
      [roll, gecko, words, cover].forEach((v) => v.stopAnimation());
    };
  }, [play, roll, gecko, words, cover]);

  if (done) return null;

  const tire = {
    transform: [
      { translateX: roll.interpolate({ inputRange: [0, 1], outputRange: [-width / 2 - 80, 0] }) },
      { rotate: roll.interpolate({ inputRange: [0, 1], outputRange: ['-540deg', '0deg'] }) },
    ],
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: cover }]}>
      <Pressable style={styles.fill} onPress={() => setDone(true)} accessibilityRole="button" accessibilityLabel="Vulcatic. Tap to skip the intro.">
        <View style={styles.center}>
          <IslandScene />

          <View style={styles.stage}>
            <Animated.View
              style={[
                styles.gecko,
                {
                  opacity: gecko.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }),
                  transform: [
                    { translateY: gecko.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
                    { scale: gecko.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                  ],
                },
              ]}
            >
              <Image source={require('@/assets/images/gecko.png')} style={StyleSheet.absoluteFill} contentFit="contain" />
            </Animated.View>

            <Animated.View style={[styles.tire, tire]}>
              <View style={styles.rim}>
                <View style={styles.spoke} />
                <View style={[styles.spoke, { transform: [{ rotate: '60deg' }] }]} />
                <View style={[styles.spoke, { transform: [{ rotate: '120deg' }] }]} />
                <View style={[styles.hub, { backgroundColor: t.sun }]} />
              </View>
            </Animated.View>
          </View>

          <Animated.View
            style={{ ...styles.words, opacity: words, transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}
          >
            <Text style={styles.name}>Vulcatic</Text>
            <Text style={[styles.tagline, { color: '#3DEB8B' }]}>Flat tire? Help is near.</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Navy panel on purpose in both modes: the name must read well on the bright sky.
  words: { backgroundColor: '#0B1F2D', borderRadius: 28, paddingHorizontal: 28, paddingVertical: 14 },
  stage: { width: 240, height: 300, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 24 },
  gecko: { position: 'absolute', top: 0, width: 160, height: 230 },
  tire: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0B1F22',
    borderWidth: 5,
    borderStyle: 'dashed',
    borderColor: '#4A6367',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rim: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#DDE9EA', alignItems: 'center', justifyContent: 'center' },
  spoke: { position: 'absolute', width: 6, height: 62, borderRadius: 3, backgroundColor: '#7F9A9E' },
  hub: { width: 22, height: 22, borderRadius: 11 },
  name: { color: '#FFFFFF', fontSize: 46, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  tagline: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 4 },
});
