import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import arEG from '../locales/ar-EG.json';
import ar from '../locales/ar.json';

const LANGUAGE_KEY = '@tabout_language';

export const supportedLanguages = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ar-EG', label: 'Egyptian Arabic', nativeLabel: 'عربي مصري' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية الفصحى' },
] as const;

export const isRTL = (lang: string) => lang === 'ar-EG' || lang === 'ar';

export const getSavedLanguage = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    return saved ?? 'en';
  } catch {
    return 'en';
  }
};

export const saveLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: { translation: en },
    'ar-EG': { translation: arEG },
    ar: { translation: ar },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
