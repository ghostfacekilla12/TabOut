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

/**
 * Parses OCR text to extract structured receipt data including itemized list.
 */
const parseReceiptText = (text: string): ReceiptData => {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  // Matches a price-like number (e.g. 120, 45.50, 1,200)
  const priceRe = /(?:^|[\s:x×*])\$?\s*(\d{1,6}(?:[,.]\d{1,3})*(?:\.\d{1,2})?)\s*(?:EGP|LE|L\.E\.|SAR|AED|USD|EUR|جنيه|ج\.م|﷼)?(?:\s|$)/i;
  const totalRe = /\b(?:total|grand\s*total|المجموع|اجمالي|إجمالي|مجموع)\b/i;
  const taxRe = /\b(?:tax|vat|ضريبة|ضرائب|قيمة\s*مضافة)\b/i;
  const serviceRe = /\b(?:service|tip|gratuity|خدمة)\b/i;
  const dateRe = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/;
  const skipRe = /\b(?:subtotal|receipt|invoice|order|cashier|server|table|date|time|phone|address|thank|welcome|كاشير|فاتورة|طلب)\b/i;

  let merchantName = 'Unknown Merchant';
  let total = 0;
  let taxAmount = 0;
  let serviceCharge = 0;
  let date = new Date().toISOString().split('T')[0];
  const items: Array<{ description: string; amount: number }> = [];

  // Merchant = first non-trivial line before we hit any prices
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && !/^\d+$/.test(line) && !dateRe.test(line) && !priceRe.test(line)) {
      merchantName = line.trim();
      break;
    }
  }

  const dateMatch = text.match(dateRe);
  if (dateMatch) date = dateMatch[1];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (totalRe.test(trimmed)) {
      const m = trimmed.match(priceRe);
      if (m) total = parseFloat(m[1].replace(',', ''));
      continue;
    }

    if (taxRe.test(trimmed)) {
      const m = trimmed.match(priceRe);
      if (m) taxAmount = parseFloat(m[1].replace(',', ''));
      continue;
    }

    if (serviceRe.test(trimmed)) {
      const m = trimmed.match(priceRe);
      if (m) serviceCharge = parseFloat(m[1].replace(',', ''));
      continue;
    }

    if (skipRe.test(trimmed)) continue;

    // Try to extract item + price from the line
    const m = trimmed.match(priceRe);
    if (m) {
      const amount = parseFloat(m[1].replace(',', ''));
      // Remove the matched price portion and currency symbol to get the item name
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

  // If no explicit total was found, calculate from items
  if (total === 0 && items.length > 0) {
    total = items.reduce((s, i) => s + i.amount, 0);
  }

  return { merchantName, total, taxAmount, serviceCharge, date, items };
};

/**
 * Analyzes a receipt image using the Mindee API and returns structured receipt data.
 * Falls back to OCR.space if Mindee is not configured.
 */
export const analyzeReceiptWithMindee = async (imageUri: string): Promise<ReceiptData> => {
  const apiKey = process.env.EXPO_PUBLIC_MINDEE_API_KEY;

  if (apiKey) {
    try {
      const formData = new FormData();
      formData.append('document', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      } as unknown as Blob);

      const response = await fetch(
        'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
        {
          method: 'POST',
          headers: { Authorization: `Token ${apiKey}` },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Mindee API error: ${response.status}`);
      }

      const result = await response.json();
      const pred = result?.document?.inference?.prediction;
      if (!pred) throw new Error('Invalid Mindee response');

      const rawItems: Array<{ description: string; amount: number }> = (
        pred.line_items ?? []
      ).map((li: { description?: string; total_amount?: number }) => ({
        description: li.description ?? '',
        amount: li.total_amount ?? 0,
      })).filter((li: { description: string; amount: number }) => li.description && li.amount > 0);

      return {
        merchantName: pred.supplier_name?.value ?? 'Unknown Merchant',
        total: pred.total_amount?.value ?? 0,
        taxAmount: pred.taxes?.[0]?.value ?? 0,
        serviceCharge: 0,
        date: pred.date?.value ?? new Date().toISOString().split('T')[0],
        items: rawItems,
      };
    } catch (err) {
      console.warn('Mindee API failed, falling back to OCR.space:', err);
    }
  }

  // Fallback: OCR.space
  const OCR_SPACE_API_KEY = 'K87153949488957';
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'receipt.jpg',
  } as unknown as Blob);
  formData.append('apikey', OCR_SPACE_API_KEY);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error(`OCR.space error: ${response.status}`);

  const result = await response.json();
  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.[0] ?? 'OCR processing failed');
  }

  const parsedText: string = result.ParsedResults?.[0]?.ParsedText ?? '';
  if (!parsedText) throw new Error('No text extracted from receipt');

  return parseReceiptText(parsedText);
};
