import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

export const native = Platform.OS !== 'web';

/** A value that goes 0 → 1 forever (and back, with `pingPong`). Stays at 0 when the phone asks for less motion. */
export function useLoop(duration: number, pingPong = false) {
  const value = useRef(new Animated.Value(0)).current;
  const [calm, setCalm] = useState(true);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => active && setCalm(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setCalm);
    return () => {
      active = false;
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (calm) return value.setValue(0);
    const to = (toValue: number) =>
      Animated.timing(value, { toValue, duration, easing: pingPong ? Easing.inOut(Easing.sin) : Easing.linear, useNativeDriver: native });
    const loop = Animated.loop(pingPong ? Animated.sequence([to(1), to(0)]) : to(1));
    loop.start();
    return () => loop.stop();
  }, [calm, duration, pingPong, value]);

  return value;
}
