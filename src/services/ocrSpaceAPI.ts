const OCR_SPACE_API_KEY = 'K87153949488957';
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

export interface ReceiptData {
  merchantName: string;
  total: number;
  taxAmount: number;
  serviceCharge: number;
  date: string;
  items: Array<{
    description: string;
    amount: number;
  }>;
}

const extractReceiptDataFromText = (text: string): ReceiptData => {
  console.log('📝 Full OCR text:', text);

  const lines = text.split('\n').filter((line) => line.trim());

  // Patterns
  const priceRe = /(?:^|[\s:x×*])\$?\s*(\d{1,6}(?:[,.]\d{1,3})*(?:\.\d{1,2})?)\s*(?:EGP|LE|L\.E\.|SAR|AED|USD|EUR|جنيه|ج\.م|﷼)?(?:\s|$)/i;
  const totalRe = /\b(?:total|grand\s*total|المجموع|اجمالي|إجمالي|مجموع)\b/i;
  const taxRe = /\b(?:tax|vat|ضريبة|ضرائب|قيمة\s*مضافة)\b/i;
  const serviceRe = /\b(?:service|tip|gratuity|خدمة)\b/i;
  const dateRe = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/;
  const skipRe = /\b(?:subtotal|receipt|invoice|order|cashier|server|table|date|time|phone|address|thank|welcome|كاشير|فاتورة|طلب)\b/i;

  // Merchant name - first non-trivial, non-price line
  let merchantName = 'Unknown Merchant';
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && !/^\d+$/.test(line) && !dateRe.test(line) && !priceRe.test(line)) {
      merchantName = line.trim();
      break;
    }
  }

  const dateMatch = text.match(dateRe);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

  const taxMatch = text.match(/tax[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
  const taxAmount = taxMatch ? parseFloat(taxMatch[1].replace(',', '')) : 0;

  const serviceMatch = text.match(/(?:service|tip|gratuity)[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
  const serviceCharge = serviceMatch ? parseFloat(serviceMatch[1].replace(',', '')) : 0;

  let total = 0;
  const items: Array<{ description: string; amount: number }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (totalRe.test(trimmed)) {
      const m = trimmed.match(priceRe);
      if (m) total = parseFloat(m[1].replace(',', ''));
      continue;
    }

    if (taxRe.test(trimmed) || serviceRe.test(trimmed) || skipRe.test(trimmed)) continue;

    const m = trimmed.match(priceRe);
    if (m) {
      const amount = parseFloat(m[1].replace(',', ''));
      const description = trimmed
        .replace(m[0], '')
        .replace(/\$|EGP|LE|L\.E\.|SAR|AED|USD|EUR|جنيه|ج\.م|﷼/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (description && amount > 0 && amount < 100_000) {
        items.push({ description, amount });
      }
    }
  }

  // Fallback: if no explicit total, sum items
  if (total === 0 && items.length > 0) {
    total = items.reduce((s, i) => s + i.amount, 0);
  }

  // Final fallback: largest amount in text
  if (total === 0) {
    const amounts: number[] = [];
    const allMatches = text.matchAll(/\$?\s*(\d+[,.]?\d*\.?\d{2})/g);
    for (const match of allMatches) {
      const num = parseFloat(match[1].replace(',', ''));
      if (!isNaN(num) && num > 0) amounts.push(num);
    }
    if (amounts.length > 0) total = Math.max(...amounts);
  }

  return { merchantName, total, taxAmount, serviceCharge, date, items };
};

export const analyzeReceiptWithOCRSpace = async (imageUri: string): Promise<ReceiptData> => {
  try {
    console.log('🔑 Using OCR.space API Key:', OCR_SPACE_API_KEY);
    console.log('📸 Image URI:', imageUri);

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);
    formData.append('apikey', OCR_SPACE_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2'); // Engine 2 is more accurate

    console.log('🚀 Sending request to OCR.space...');

    const response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      body: formData,
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      throw new Error(`OCR.space API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ OCR.space response:', JSON.stringify(result, null, 2));

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
    }

    const parsedText = result.ParsedResults?.[0]?.ParsedText || '';
    
    if (!parsedText) {
      throw new Error('No text extracted from receipt');
    }

    console.log('📄 Extracted text:', parsedText);

    return extractReceiptDataFromText(parsedText);
  } catch (error) {
    console.error('❌ OCR.space Error:', error);
    throw new Error('Failed to analyze receipt. Please try again.');
  }
};