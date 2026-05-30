import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Returns true when CSS animations should run: web only, and only if the user
// has not asked for reduced motion at the OS level.
export function useCanAnimate(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(!mql.matches);
    sync();
    mql.addEventListener?.('change', sync);
    return () => mql.removeEventListener?.('change', sync);
  }, []);

  return enabled;
}
