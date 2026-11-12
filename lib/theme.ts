import { useColorScheme } from 'react-native';

/**
 * Vulcatic brand colors
 *  - Orange #D84300: everything you can tap (buttons, likes, active tab)
 *  - Gecko green #04EA24: the mascot / brand highlights
 *  - Charcoal #575E6B / #1E2127: text, surfaces, dark mode
 */
export const brand = {
  orange: '#D84300',
  green: '#04EA24',
  charcoal: '#575E6B',
  ink: '#1E2127',
};

const light = {
  scheme: 'light' as 'light' | 'dark',
  background: '#F7F5F3',
  card: '#FFFFFF',
  text: '#1E2127',
  muted: '#6B7079',
  border: '#E8E4E0',
  skeleton: '#ECE8E4',
  /** Fill color for buttons. White text on it. */
  primary: brand.orange,
  onPrimary: '#FFFFFF',
  /** Orange used for text and icons (links, liked heart). */
  accent: brand.orange,
  accentSoft: '#FCE9DF',
  success: '#0E9F2C',
  successSoft: '#E3F9E7',
  danger: '#C62828',
  dangerSoft: '#FDECEC',
};

const dark: typeof light = {
  scheme: 'dark',
  background: '#121418',
  card: '#1E2127',
  text: '#F3F4F6',
  muted: '#9AA0AA',
  border: '#2C3038',
  skeleton: '#2A2E36',
  primary: brand.orange,
  onPrimary: '#FFFFFF',
  accent: '#FF7A3D',
  accentSoft: '#3A2216',
  success: '#3BE05A',
  successSoft: '#163A20',
  danger: '#F87171',
  dangerSoft: '#3A1A1A',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
