import { useEffect } from 'react';
import { theme } from '@/shared/theme';
import './web/global.css';

/** Mantiene las variables CSS sincronizadas con los tokens de iOS/Android. */
export function GlobalStyles() {
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') root.style.setProperty(`--sotos-${key}`, value);
    });
  }, []);
  return null;
}
