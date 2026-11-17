import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/** Data fills stay under 300ms — this is the dashboard refreshing, not a modal entrance. */
const DEFAULT_DURATION_MS = 280;

/**
 * Smoothly tweens to `target` (JS driven, so it works for SVG props on every platform).
 * With `enabled=false` — or when the OS reduce-motion setting is on — it returns `target` unchanged.
 */
export function useAnimatedNumber(target: number, enabled = true, duration = DEFAULT_DURATION_MS): number {
  const safe = Number.isFinite(target) ? target : 0;
  const [anim] = useState(() => new Animated.Value(0));
  const [value, setValue] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const update = (on: boolean): void => setReduceMotion(on);
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion) return;
    const id = anim.addListener(({ value: v }) => setValue(v));
    Animated.timing(anim, {
      toValue: safe,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [anim, safe, enabled, duration, reduceMotion]);

  return enabled && !reduceMotion ? value : safe;
}
