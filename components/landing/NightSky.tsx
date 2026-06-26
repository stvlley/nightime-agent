import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useCanAnimate } from '@/hooks/useCanAnimate';
import { landingPalette } from './styles';

// Deterministic pseudo-random so SSR and CSR match and stars don't reshuffle on every render.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type Star = { x: number; y: number; r: number; delay: number; duration: number };
type Cloud = { x: number; y: number; w: number; h: number; opacity: number; duration: number };

function buildStars(count = 60, seed = 42): Star[] {
  const rand = seeded(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const tier = rand();
    const r = tier > 0.92 ? 2.5 : tier > 0.7 ? 1.6 : 1;
    stars.push({
      x: rand() * 100,
      y: rand() * 100,
      r,
      delay: rand() * 6,
      duration: 3 + rand() * 4,
    });
  }
  return stars;
}

function buildClouds(seed = 17): Cloud[] {
  const rand = seeded(seed);
  const clouds: Cloud[] = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: rand() * 100 - 10,
      y: 8 + rand() * 70,
      w: 180 + rand() * 220,
      h: 40 + rand() * 30,
      opacity: 0.06 + rand() * 0.08,
      duration: 90 + rand() * 60,
    });
  }
  return clouds;
}

const STARS = buildStars();
const CLOUDS = buildClouds();
const starGlow = 'rgba(139, 118, 230, 0.26)';

const KEYFRAMES = `
@keyframes nightime-twinkle {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
@keyframes nightime-drift {
  0% { transform: translateX(-10%); }
  100% { transform: translateX(110%); }
}
`;

let keyframesInjected = false;
function injectKeyframes() {
  if (Platform.OS !== 'web' || keyframesInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.setAttribute('data-nightime', 'keyframes');
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
  keyframesInjected = true;
}

type NightSkyProps = {
  height?: number | string;
  showMoon?: boolean;
};

export function NightSky({ height = '100%', showMoon = true }: NightSkyProps) {
  const canAnimate = useCanAnimate();

  useEffect(() => {
    injectKeyframes();
  }, []);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, { height: height as ViewStyle['height'] }]}
    >
      {CLOUDS.map((c, i) => (
        <View
          key={`c-${i}`}
          style={[
            styles.cloud,
            {
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: c.w,
              height: c.h,
              opacity: c.opacity,
            },
            canAnimate
              ? ({
                  animationName: 'nightime-drift',
                  animationDuration: `${c.duration}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationDelay: `${-c.duration * (i / CLOUDS.length)}s`,
                } as unknown as ViewStyle)
              : null,
          ]}
        />
      ))}

      {showMoon ? <View style={styles.moon} /> : null}

      {STARS.map((s, i) => (
        <View
          key={`s-${i}`}
          style={[
            styles.star,
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: s.r,
            },
            canAnimate
              ? ({
                  animationName: 'nightime-twinkle',
                  animationDuration: `${s.duration}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${s.delay}s`,
                } as unknown as ViewStyle)
              : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: landingPalette.purpleAccent,
    opacity: 0.6,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: `0 0 6px ${starGlow}` } as unknown as ViewStyle)
      : {}),
  },
  cloud: {
    position: 'absolute',
    backgroundColor: landingPalette.purpleAccent,
    borderRadius: 999,
    ...(Platform.OS === 'web'
      ? ({ filter: 'blur(28px)' } as unknown as ViewStyle)
      : {}),
  },
  moon: {
    position: 'absolute',
    right: '8%',
    top: '12%',
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: landingPalette.purpleAccent,
    opacity: 0.18,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: `0 0 80px 20px ${starGlow}`,
          filter: 'blur(1px)',
        } as unknown as ViewStyle)
      : {}),
  },
});
