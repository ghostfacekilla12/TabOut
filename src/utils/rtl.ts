import { I18nManager } from 'react-native';

export const isRTL = I18nManager.isRTL;

export const textAlign = I18nManager.isRTL ? ('right' as const) : ('left' as const);

export const flexDirection = I18nManager.isRTL ? ('row-reverse' as const) : ('row' as const);

export const alignItems = I18nManager.isRTL ? ('flex-end' as const) : ('flex-start' as const);
