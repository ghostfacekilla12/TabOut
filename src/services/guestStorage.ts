import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_SPLITS_KEY = '@tabout_guest_splits';
const MAX_GUEST_SPLITS = 3;

export interface GuestSplit {
  id: string;
  description: string;
  total: number;
  paidBy: string;
  participants: string[];
  createdAt: string;
}

export const getGuestSplits = async (): Promise<GuestSplit[]> => {
  try {
    const data = await AsyncStorage.getItem(GUEST_SPLITS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveGuestSplit = async (split: GuestSplit): Promise<boolean> => {
  try {
    const splits = await getGuestSplits();

    if (splits.length >= MAX_GUEST_SPLITS) {
      return false;
    }

    splits.push(split);
    await AsyncStorage.setItem(GUEST_SPLITS_KEY, JSON.stringify(splits));
    return true;
  } catch {
    return false;
  }
};

export const getGuestSplitCount = async (): Promise<number> => {
  const splits = await getGuestSplits();
  return splits.length;
};

export const clearGuestData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(GUEST_SPLITS_KEY);
  } catch {
    // ignore
  }
};

export const canCreateGuestSplit = async (): Promise<boolean> => {
  const count = await getGuestSplitCount();
  return count < MAX_GUEST_SPLITS;
};
