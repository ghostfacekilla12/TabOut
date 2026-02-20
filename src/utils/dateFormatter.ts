import type { Language } from '../types';

const LOCALES: Record<Language, string> = {
  en: 'en-US',
  'ar-EG': 'ar-EG',
  ar: 'ar',
};

export const formatRelativeTime = (dateStr: string, language: Language = 'en'): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (language === 'ar-EG') {
    if (diffSeconds < 60) return 'دلوقتي';
    if (diffMinutes < 60) return `${diffMinutes} دقيقة`;
    if (diffHours < 24) return `${diffHours} ساعة`;
    if (diffDays === 1) return 'امبارح';
    if (diffDays < 7) return `${diffDays} أيام`;
    return formatDate(dateStr, language);
  }

  if (language === 'ar') {
    if (diffSeconds < 60) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return formatDate(dateStr, language);
  }

  // English
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr, language);
};

export const formatDate = (dateStr: string, language: Language = 'en'): string => {
  const date = new Date(dateStr);
  const locale = LOCALES[language];
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateStr: string, language: Language = 'en'): string => {
  const date = new Date(dateStr);
  const locale = LOCALES[language];
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
