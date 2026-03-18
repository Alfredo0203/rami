// Re-exports useLanguage as useTranslation for backward compatibility.
// All existing components using useTranslation() continue to work unchanged.
export { useLanguage as useTranslation } from './LanguageProvider';