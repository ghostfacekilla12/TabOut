import type { Currency, Language } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EGP: 'ج.م',
  USD: '$',
  EUR: '€',
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
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = Math.abs(amount).toFixed(2);
  const isArabic = language === 'ar-EG' || language === 'ar';
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

export const parseAmount = (value: string): number => {
  const arabicToEnglish = value.replace(/[٠-٩]/g, (d) => {
    const index = '٠١٢٣٤٥٦٧٨٩'.indexOf(d);
    return index >= 0 ? String(index) : d;
  });
  return parseFloat(arabicToEnglish) || 0;
};
