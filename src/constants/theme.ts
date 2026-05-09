// src/constants/theme.ts
export const colors = {
  primary: '#8B1A1A',
  primaryDark: '#5C0F0F',
  primaryLight: '#B33030',
  'on-primary': '#FFFFFF',
  'primary-container': '#8B1A1A',
  'on-primary-container': '#FFCDD2',
  
  secondary: '#0077B6',
  'secondary-container': '#67BAFD',
  'on-secondary': '#FFFFFF',
  
  tertiary: '#BC6C25',
  'tertiary-container': '#5F2F00',
  'on-tertiary': '#FFFFFF',
  'on-tertiary-container': '#EA9147',
  
  sand: '#F4A261',
  mint: '#A5D0B9',
  
  surface: '#F8F9FA',
  'surface-dim': '#D9DADB',
  'surface-bright': '#F8F9FA',
  
  'surface-container-lowest': '#FFFFFF',
  'surface-container-low': '#F3F4F5',
  'surface-container': '#EDEEEF',
  'surface-container-high': '#E7E8E9',
  'surface-container-highest': '#E1E3E4',
  
  'on-surface': '#191C1D',
  'on-surface-variant': '#414844',
  
  outline: '#717973',
  'outline-variant': '#C1C8C2',
  
  error: '#BA1A1A',
  'error-container': '#FFDAD6',
  'on-error': '#FFFFFF',
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  base: 4,
  edge: 20,
  gutter: 12,
  'gutter-discovery': 16,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fonts = {
  displayBold: 'PlusJakartaSans_700Bold',
  displaySemiBold: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

// Brand-tinted shadow utility — define this once and reuse:
export const cardShadow = {
  shadowColor: '#8B1A1A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

export const theme = {
  colors,
  spacing,
  radius,
  fonts,
  cardShadow,
} as const;

export type Theme = typeof theme;
