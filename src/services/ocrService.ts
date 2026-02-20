import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface ReceiptData {
  items: Array<{
    name: string;
    price: number;
  }>;
  total: number;
  tax?: number;
  service?: number;
  date?: string;
  merchant?: string;
}

const MAX_REASONABLE_ITEM_PRICE = 10000;

export async function scanReceiptFromCamera(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

  if (permissionResult.status !== 'granted') {
    Alert.alert('Permission Required', 'Camera permission is required to scan receipts!');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }

  return null;
}

export async function scanReceiptFromGallery(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permissionResult.status !== 'granted') {
    Alert.alert('Permission Required', 'Photo library permission is required!');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }

  return null;
}

export async function extractTextFromImage(imageUri: string): Promise<string> {
  try {
    const result = await TextRecognition.recognize(imageUri);
    return result.text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function parseReceiptText(text: string): ReceiptData {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

  const items: Array<{ name: string; price: number }> = [];
  let total = 0;
  let tax = 0;
  let service = 0;
  let merchant = '';
  let date = '';

  const pricePattern = /(\d+\.?\d*)\s*(EGP|LE|L\.E\.|جنيه|ج\.م)?/i;
  const totalPattern = /(total|المجموع|اجمالي|إجمالي)/i;
  const taxPattern = /(tax|ضريبة|ضرائب)/i;
  const servicePattern = /(service|خدمة)/i;
  const datePattern = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/;

  if (lines.length > 0) {
    merchant = lines[0];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      date = dateMatch[1];
    }

    if (totalPattern.test(line)) {
      const match = line.match(pricePattern);
      if (match) {
        total = parseFloat(match[1]);
      }
      continue;
    }

    if (taxPattern.test(line)) {
      const match = line.match(pricePattern);
      if (match) {
        tax = parseFloat(match[1]);
      }
      continue;
    }

    if (servicePattern.test(line)) {
      const match = line.match(pricePattern);
      if (match) {
        service = parseFloat(match[1]);
      }
      continue;
    }

    const priceMatch = line.match(pricePattern);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      const itemName = line.replace(pricePattern, '').trim();

      if (itemName && price > 0 && price < MAX_REASONABLE_ITEM_PRICE) {
        items.push({ name: itemName, price });
      }
    }
  }

  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, item) => sum + item.price, 0);
  }

  return {
    items,
    total,
    tax: tax > 0 ? tax : undefined,
    service: service > 0 ? service : undefined,
    date: date || undefined,
    merchant: merchant || undefined,
  };
}

export async function scanAndParseReceipt(imageUri: string): Promise<ReceiptData> {
  const text = await extractTextFromImage(imageUri);
  return parseReceiptText(text);
}
