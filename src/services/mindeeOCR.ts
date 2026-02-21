import { analyzeReceiptWithOCRSpace } from './ocrSpaceAPI';
export type { ReceiptData } from './ocrSpaceAPI';
import type { ReceiptData, ReceiptItem } from './ocrSpaceAPI';

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

      const rawItems: ReceiptItem[] = (
        pred.line_items ?? []
      ).map((li: { description?: string; total_amount?: number }) => ({
        quantity: 1,
        name: li.description ?? '',
        price: li.total_amount ?? 0,
      })).filter((li: ReceiptItem) => li.name && li.price > 0);

      const total = pred.total_amount?.value ?? 0;
      const taxAmount = pred.taxes?.[0]?.value ?? 0;

      return {
        merchantName: pred.supplier_name?.value ?? 'Unknown Merchant',
        total,
        taxAmount,
        serviceCharge: 0,
        date: pred.date?.value ?? new Date().toISOString().split('T')[0],
        subtotal: total,
        discount: 0,
        deliveryFee: 0,
        serviceFee: 0,
        items: rawItems,
      };
    } catch (err) {
      console.warn('Mindee API failed, falling back to OCR.space:', err);
    }
  }

  // Fallback: delegate to OCR.space
  return analyzeReceiptWithOCRSpace(imageUri);
};
