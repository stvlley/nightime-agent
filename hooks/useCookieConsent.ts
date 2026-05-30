import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConsentPreference } from '@/components/landing/types';

const COOKIE_CONSENT_KEY = '@landing_cookie_consent';

export function useCookieConsent() {
  const [preference, setPreference] = useState<ConsentPreference | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(COOKIE_CONSENT_KEY)
      .then((value) => {
        if (cancelled) return;
        if (value === 'accepted' || value === 'rejected') {
          setPreference(value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savePreference = async (nextPreference: ConsentPreference) => {
    setPreference(nextPreference);
    await AsyncStorage.setItem(COOKIE_CONSENT_KEY, nextPreference);
  };

  return {
    preference,
    loaded,
    savePreference,
  };
}
