import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@tabout_theme';

export type ThemeMode = 'light' | 'dark';

export const getThemeMode = async (): Promise<ThemeMode> => {
  try {
    const mode = await AsyncStorage.getItem(THEME_KEY);
    return (mode as ThemeMode) || 'light';
  } catch {
    return 'light';
  }
};

export const setThemeMode = async (mode: ThemeMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch {
    // ignore
  }
};
