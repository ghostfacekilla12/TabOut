const MINDEE_API_KEY = 'md_9jWkLBVD2x4swt6If3eVxyTyGZDuT6vI3GDippuxuCU';
const MINDEE_API_URL = 'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict';

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

export const analyzeReceiptWithMindee = async (imageUri: string): Promise<ReceiptData> => {
  try {
    const formData = new FormData();
    formData.append('document', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);

    const response = await fetch(MINDEE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${MINDEE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Mindee API error: ${response.status}`);
    }

    const result = await response.json();

    const prediction = result.document.inference.prediction;

    const merchantName = prediction.supplier_name?.value || 'Unknown Merchant';
    const total = prediction.total_amount?.value || 0;
    const taxAmount = prediction.total_tax?.value || 0;
    const date = prediction.date?.value || new Date().toISOString().split('T')[0];

    const items = (prediction.line_items || []).map((item: any) => ({
      description: item.description || 'Item',
      amount: item.total_amount || 0,
    }));

    const serviceCharge = prediction.tip?.value || 0;

    return {
      merchantName,
      total,
      taxAmount,
      serviceCharge,
      date,
      items,
    };
  } catch (error) {
    console.error('Mindee OCR Error:', error);
    throw new Error('Failed to analyze receipt. Please try again.');
  }
};
