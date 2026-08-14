// src/i18n/index.js
import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zhCN from './locales/zh-CN'

const savedLocale = localStorage.getItem('locale') || 'zh-CN'

// keep <html lang> in sync with the initial locale too (index.html defaults to en)
if (typeof document !== 'undefined') {
  document.querySelector('html').setAttribute('lang', savedLocale)
}

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
  },
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
  document.querySelector('html').setAttribute('lang', locale)
}

export default i18n
