import { useMemo } from 'react';
import en from './en';
import es from './es';
import pt from './pt';

const translations = { en, es, pt };

function detectLanguage() {
  const lang = navigator.language || navigator.userLanguage || 'en';
  const code = lang.toLowerCase().split('-')[0];
  return translations[code] ? code : 'en';
}

/**
 * Returns a `t(key, vars)` function that translates keys using the device language.
 * Supports simple interpolation: t('search_results', { count: 5, query: 'shirt' })
 */
export function useTranslation() {
  const lang = useMemo(() => detectLanguage(), []);
  const dict = translations[lang] || en;

  const t = (key, vars = {}) => {
    let str = dict[key] ?? en[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
    return str;
  };

  return { t, lang };
}