import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import bm from '../locales/bm/translation.json'
import en from '../locales/en/translation.json'
import id from '../locales/id/translation.json'
import ar from '../locales/ar/translation.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      bm: { translation: bm },
      en: { translation: en },
      id: { translation: id },
      ar: { translation: ar },
    },
    lng: 'bm',
    fallbackLng: 'bm',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'madrasah_language',
    },
  })

export default i18n
