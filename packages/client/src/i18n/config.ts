/**
 * i18n Configuration
 * Internationalization setup for the application
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

const resources = {
  zh: { translation: zh },
  en: { translation: en }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'zh', // Default language
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
