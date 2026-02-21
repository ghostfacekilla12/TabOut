import type { Currency, Language } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EGP: 'E£',
  USD: '$',
  EUR: '€',
  SAR: 'SR',
  AED: 'AED',
};

const ARABIC_CURRENCY_SYMBOLS: Record<Currency, string> = {
  EGP: 'ج.م',
  USD: '$',
  EUR: '€',
  SAR: 'ر.س',
  AED: 'د.إ',
};

const ARABIC_NUMERALS: Record<string, string> = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

const toArabicNumerals = (str: string): string =>
  str.replace(/[0-9]/g, (digit) => ARABIC_NUMERALS[digit] ?? digit);

export const formatCurrency = (
  amount: number,
  currency: Currency = 'EGP',
  language: Language = 'en'
): string => {
  const isArabic = language === 'ar-EG' || language === 'ar';
  const symbol = isArabic ? ARABIC_CURRENCY_SYMBOLS[currency] : CURRENCY_SYMBOLS[currency];
  const formatted = Math.abs(amount).toFixed(2);
  const displayAmount = isArabic ? toArabicNumerals(formatted) : formatted;

  if (language === 'en') {
    return `${symbol} ${displayAmount}`;
  }
  return `${displayAmount} ${symbol}`;
};

export const formatAmount = (amount: number, language: Language = 'en'): string => {
  const formatted = Math.abs(amount).toFixed(2);
  if (language === 'ar-EG' || language === 'ar') {
    return toArabicNumerals(formatted);
  }
  return formatted;
};

export const getCurrencySymbol = (currency: Currency, language: Language = 'en'): string => {
  const isArabic = language === 'ar-EG' || language === 'ar';
  return isArabic ? ARABIC_CURRENCY_SYMBOLS[currency] : CURRENCY_SYMBOLS[currency];
};

export const AVAILABLE_CURRENCIES: Currency[] = ['EGP', 'USD', 'EUR', 'SAR', 'AED'];

export const parseAmount = (value: string): number => {
  const arabicToEnglish = value.replace(/[٠-٩]/g, (d) => {
    const index = '٠١٢٣٤٥٦٧٨٩'.indexOf(d);
    return index >= 0 ? String(index) : d;
  });
  return parseFloat(arabicToEnglish) || 0;
};
