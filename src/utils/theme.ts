const sharedTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 999,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const },
    h2: { fontSize: 22, fontWeight: '700' as const },
    h3: { fontSize: 18, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
    label: { fontSize: 14, fontWeight: '500' as const },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 4,
    },
  },
};

export const lightTheme = {
  ...sharedTheme,
  colors: {
    primary: '#3B82F6',
    primaryEnd: '#8B5CF6',
    accent: '#6366F1',
    success: '#10B981',
    warning: '#EF4444',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
    shadow: '#000000',
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#9CA3AF',
    disabled: '#D1D5DB',
  },
};

export const darkTheme = {
  ...sharedTheme,
  colors: {
    primary: '#3B82F6',
    primaryEnd: '#8B5CF6',
    accent: '#818CF8',
    success: '#34D399',
    warning: '#F87171',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: '#2A2A2A',
    card: '#2A2A2A',
    shadow: '#000000',
    positive: '#34D399',
    negative: '#F87171',
    neutral: '#6B7280',
    disabled: '#374151',
  },
};

export const theme = lightTheme;

export type Theme = typeof lightTheme;
