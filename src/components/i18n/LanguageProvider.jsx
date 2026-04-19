import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './en';
import es from './es';
import pt from './pt';

const translations = { en, es, pt };

function detectLanguage() {
  return 'es'; // Fixed to Spanish — app targets El Salvador
}

const LanguageContext = createContext({ lang: 'es', t: (k) => k, setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('app_language');
    return saved || detectLanguage();
  });

  useEffect(() => {
    localStorage.setItem('app_language', lang);
  }, [lang]);

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
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}