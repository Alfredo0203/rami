import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './en';
import es from './es';
import pt from './pt';

const translations = { en, es, pt };

function detectLanguage() {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
    for (const lang of langs) {
      const code = lang.toLowerCase().split('-')[0];
      if (translations[code]) return code;
    }
  } catch (_) {}
  return 'en';
}

const LanguageContext = createContext({ lang: 'en', t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage);

  useEffect(() => {
    const handler = () => setLang(detectLanguage());
    window.addEventListener('languagechange', handler);
    return () => window.removeEventListener('languagechange', handler);
  }, []);

  const t = useCallback((key, vars = {}) => {
    const dict = translations[lang] || en;
    let str = dict[key] ?? en[key] ?? key;
    if (vars && Object.keys(vars).length > 0) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}