import type { ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useLoop } from '@/lib/motion';

type Props = { color: string; radius: number; on?: boolean; children: ReactNode };

/** Rings that grow out of a button, like a signal calling for help. Off when the phone asks for less motion. */
export function Pulse({ color, radius, on = true, children }: Props) {
  const a = useLoop(1800);
  const b = useLoop(1800);
  const ring = (v: Animated.Value, delay: number) => (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radius,
          borderWidth: 3,
          borderColor: color,
          opacity: v.interpolate({ inputRange: [0, delay, 1], outputRange: [0, 0.7, 0] }),
          transform: [
            { scaleX: v.interpolate({ inputRange: [0, delay, 1], outputRange: [1, 1, 1.08] }) },
            { scaleY: v.interpolate({ inputRange: [0, delay, 1], outputRange: [1, 1, 1.45] }) },
          ],
        },
      ]}
    />
  );
  return (
    <View>
      {on && ring(a, 0.01)}
      {on && ring(b, 0.5)}
      {children}
    </View>
  );
}
