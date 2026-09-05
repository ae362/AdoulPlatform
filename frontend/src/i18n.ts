import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { i18nStrings } from '../../shared';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    detection: {
      // Make behavior consistent across browsers:
      // 1) Use the user's saved choice when available
      // 2) Otherwise fall back to `fallbackLng` instead of using navigator language
      order: ['localStorage', 'cookie'],
      caches: ['localStorage', 'cookie'],
      // Normalize locales like en-US / ar-MA to their base language
      convertDetectedLanguage: (lng: string) => (lng || '').toLowerCase().split(/[-_]/)[0],
    },
    resources: Object.entries(i18nStrings).reduce((acc, [lng, strings]) => {
      acc[lng] = { translation: strings };
      return acc;
    }, {} as Record<string, { translation: Record<string, string> }>),
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    supportedLngs: Object.keys(i18nStrings),
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    defaultNS: 'translation',
  });

export default i18n;
