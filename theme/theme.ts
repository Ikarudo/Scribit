import type { MD3Theme } from 'react-native-paper';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// App color palette – matches existing M3-inspired design
const lightColors = {
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E9DDFF',
  onPrimaryContainer: '#22005D',
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1E192B',
  tertiary: '#7E5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#f5eef0',
  onTertiaryContainer: '#31101D',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#FEF7FF',
  onBackground: '#1D1B20',
  surface: '#FEF7FF',
  onSurface: '#1D1B20',
  surfaceVariant: '#ffffff',
  onSurfaceVariant: '#49454E',
  outline: '#7A757F',
  outlineVariant: '#CAC4CF',
  shadow: '#000000',
  scrim: 'rgba(0, 0, 0, 0.4)',
  inverseSurface: '#313033',
  inverseOnSurface: '#F5EFF4',
  inversePrimary: '#CFBCFF',
  surfaceDisabled: 'rgba(29, 27, 32, 0.12)',
  onSurfaceDisabled: 'rgba(29, 27, 32, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.4)',
} as const;

const darkColors = {
  primary: '#CFBCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#E9DDFF',
  secondary: '#CCC2DC',
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',
  tertiary: '#EFB8C8',
  onTertiary: '#492532',
  tertiaryContainer: '#633B48',
  onTertiaryContainer: '#FFD9E3',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  background: '#000000',
  onBackground: '#E6E1E5',
  surface: '#141218',
  onSurface: '#ffffff',
  surfaceVariant: '#121113',
  onSurfaceVariant: '#CAC4CF',
  outline: '#938F99',
  outlineVariant: '#49454E',
  shadow: '#000000',
  scrim: 'rgba(0, 0, 0, 0.6)',
  inverseSurface: '#E6E1E5',
  inverseOnSurface: '#313033',
  inversePrimary: '#6750A4',
  surfaceDisabled: 'rgba(230, 225, 229, 0.12)',
  onSurfaceDisabled: 'rgba(230, 225, 229, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
} as const;

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: false,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: 16,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
};

// Optional: card tint colors for lists/cards (use from theme in components)
export const cardTintsLight = [
  '#F6EDFF',
  '#E8DEF8',
  '#FFD9E3',
  '#E8F5E9',
  '#FFF8E1',
  '#E3F2FD',
];

export const cardTintsDark = [
  '#2D2640',
  '#2E2A3E',
  '#3E2A32',
  '#1E2E1F',
  '#3E3820',
  '#1A2835',
];

export type AppTheme = MD3Theme;
