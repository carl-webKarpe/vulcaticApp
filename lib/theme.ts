import { useColorScheme } from 'react-native';

const light = {
  background: '#F6F7F9',
  card: '#FFFFFF',
  text: '#14161A',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#E8542C',
  primaryText: '#FFFFFF',
  danger: '#DC2626',
};

const dark: typeof light = {
  background: '#0E0F12',
  card: '#1A1C21',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  border: '#2A2D34',
  primary: '#FF6B3D',
  primaryText: '#FFFFFF',
  danger: '#F87171',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
