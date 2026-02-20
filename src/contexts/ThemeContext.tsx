import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

import { getThemeMode, setThemeMode, ThemeMode } from '../services/themeStorage';
import { lightTheme, darkTheme } from '../utils/theme';

interface ThemeContextValue {
  theme: typeof lightTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    void getThemeMode().then((mode) => {
      setIsDark(mode === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const newMode: ThemeMode = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    try {
      await setThemeMode(newMode);
    } catch {
      setIsDark(isDark);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
