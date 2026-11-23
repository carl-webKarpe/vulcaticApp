import { useColorScheme } from 'react-native';

/**
 * Vulcatic palette:
 *  - Green #00C853: buttons   - Sky blue #00B4DB: headers   - Yellow #FFC107: the one most important action
 *  - Coral #FF6B6B: shops     - Navy #0B1F2D: text, dark mode   - Light #F8FAFC: background
 * Text on green, blue and yellow is navy: white would be too hard to read there.
 */
export const brand = {
  orange: '#FF6B6B',
  green: '#00C853',
  ink: '#0B1F2D',
};

type Tint = { bg: string; fg: string };
export type TintName = 'green' | 'coral' | 'amber' | 'blue';
type Gradient = [string, string, string];

const light = {
  scheme: 'light' as 'light' | 'dark',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0B1F2D',
  muted: '#4A6072',
  border: '#D5E6EF',
  skeleton: '#E4EFF5',
  /** Fill color for buttons, with onPrimary text. */
  primary: '#00C853',
  onPrimary: '#0B1F2D',
  /** Green dark enough for text and icons (links). */
  accent: '#00713A',
  accentSoft: '#D3F8E1',
  sun: '#FFC107',
  onSun: '#0B1F2D',
  success: '#00713A',
  successSoft: '#D3F8E1',
  danger: '#C62828',
  dangerSoft: '#FFE9E9',
  /** Big colored headers, with onHero text. */
  hero: ['#5AD8F5', '#00B4DB', '#00C853'] as Gradient,
  onHero: '#0B1F2D',
  /** Moving island scene. */
  sky: ['#2E9BEA', '#5CD0F8', '#C9F3FF'] as Gradient,
  sea: ['#00B4DB', '#12CDBF'],
  tints: {
    green: { bg: '#D3F8E1', fg: '#00713A' },
    coral: { bg: '#FFE1E1', fg: '#A82A2A' },
    amber: { bg: '#FFF1C2', fg: '#7A5200' },
    blue: { bg: '#D3F1FB', fg: '#00587A' },
  } as Record<TintName, Tint>,
};

const dark: typeof light = {
  scheme: 'dark',
  background: '#0B1F2D',
  card: '#12304A',
  text: '#F8FAFC',
  muted: '#A9C2D2',
  border: '#22486A',
  skeleton: '#1A3D5C',
  primary: '#00C853',
  onPrimary: '#0B1F2D',
  accent: '#3DEB8B',
  accentSoft: '#0E4A3A',
  sun: '#FFC107',
  onSun: '#0B1F2D',
  success: '#3DEB8B',
  successSoft: '#0E4A3A',
  danger: '#FF9A9A',
  dangerSoft: '#4A2430',
  hero: ['#0A4A78', '#07607E', '#0A6B4E'],
  onHero: '#F8FAFC',
  sky: ['#06263F', '#0A4A78', '#1177A0'],
  sea: ['#075E86', '#0A7A86'],
  tints: {
    green: { bg: '#0E4A3A', fg: '#3DEB8B' },
    coral: { bg: '#52273A', fg: '#FFABAB' },
    amber: { bg: '#4A3C10', fg: '#FFD454' },
    blue: { bg: '#0D4668', fg: '#6FDDF7' },
  },
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
