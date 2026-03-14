import { useMemo, useCallback } from 'react';
import en from './en';
import es from './es';
import pt from './pt';

const translations = { en, es, pt };

function detectLanguage() {
  try {
    // navigator.languages is the standard array (most accurate on mobile)
    const langs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || 'en'];

    for (const lang of langs) {
      const code = lang.toLowerCase().split('-')[0];
      if (translations[code]) return code;
    }
  } catch (e) {
    // ignore
  }
  return 'en';
}

// Detect once at module level so it's stable across re-renders
const DETECTED_LANG = detectLanguage();

/**
 * Returns a stable `t(key, vars)` function that translates keys using the device language.
 * Supports simple interpolation: t('search_results', { count: 5, query: 'shirt' })
 */
export function useTranslation() {
  const dict = translations[DETECTED_LANG] || en;

  const t = useCallback((key, vars = {}) => {
    let str = dict[key] ?? en[key] ?? key;
    if (Object.keys(vars).length > 0) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [dict]);

  return { t, lang: DETECTED_LANG };
}