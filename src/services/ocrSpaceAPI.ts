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
  
  const lines = text.split('\n').filter(line => line.trim());
  
  // Find all monetary amounts
  const amounts: number[] = [];
  const amountMatches = text.matchAll(/\$?\s*(\d+[,.]?\d*\.?\d{2})/g);
  for (const match of amountMatches) {
    const num = parseFloat(match[1].replace(',', ''));
    if (!isNaN(num) && num > 0) amounts.push(num);
  }
  
  // Total is usually the largest amount
  const total = amounts.length > 0 ? Math.max(...amounts) : 0;
  
  // Merchant name - first non-empty, non-numeric line
  let merchantName = 'Unknown Merchant';
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && !line.match(/^\d+$/) && !line.match(/\d{1,2}\/\d{1,2}/)) {
      merchantName = line.trim();
      break;
    }
  }
  
  // Find date
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
  
  // Find tax
  const taxMatch = text.match(/tax[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
  const taxAmount = taxMatch ? parseFloat(taxMatch[1].replace(',', '')) : 0;
  
  // Find service charge/tip
  const serviceMatch = text.match(/(?:service|tip|gratuity)[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
  const serviceCharge = serviceMatch ? parseFloat(serviceMatch[1].replace(',', '')) : 0;
  
  return {
    merchantName,
    total,
    taxAmount,
    serviceCharge,
    date,
    items: [],
  };
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