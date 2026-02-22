import type { Currency, Language } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EGP: 'EGP',
  USD: 'USD',
  EUR: 'EUR',
  SAR: 'SAR',
  AED: 'AED',
};

const ARABIC_CURRENCY_SYMBOLS: Record<Currency, string> = {
  EGP: 'جنيه',
  USD: 'دولار',
  EUR: 'يورو',
  SAR: 'ريال',
  AED: 'درهم',
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
  // ✅ DEBUG - ADD THIS
  console.log('💰 [formatCurrency] Input:', { amount, currency, language });
  
  // ✅ FIX: Check language properly
  const isArabic = language === 'ar' || language === 'ar-EG';
  
  console.log('💰 [formatCurrency] isArabic:', isArabic);
  
  // ✅ Pick correct symbol based on language
  const symbol = isArabic ? ARABIC_CURRENCY_SYMBOLS[currency] : CURRENCY_SYMBOLS[currency];
  
  console.log('💰 [formatCurrency] symbol:', symbol);
  
  // ✅ Format amount
  const formatted = Math.abs(amount).toFixed(2);
  
  // ✅ Convert to Arabic numerals if Arabic
  const displayAmount = isArabic ? toArabicNumerals(formatted) : formatted;

  console.log('💰 [formatCurrency] displayAmount:', displayAmount);
  console.log('💰 [formatCurrency] Final output:', isArabic ? `${displayAmount} ${symbol}` : `${displayAmount} ${symbol}`);

  // ✅ Format: English = "100.00 EGP" | Arabic = "١٠٠٫٠٠ جنيه"
  if (isArabic) {
    return `${displayAmount} ${symbol}`;
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