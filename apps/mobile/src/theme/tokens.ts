import { Platform, type TextStyle } from 'react-native';

export type ColorScheme = 'dark' | 'light';

export interface SyntaxColors {
  plain: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  type: string;
  punctuation: string;
  property: string;
}

export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceRaised: string;
  surfacePressed: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  secondary: string;
  secondaryMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  overlay: string;
  skeleton: string;
  codeBackground: string;
  codeBorder: string;
  gradientHero: readonly [string, string, ...string[]];
  gradientAccent: readonly [string, string, ...string[]];
  syntax: SyntaxColors;
}

const dark: ThemeColors = {
  background: '#0B1020',
  backgroundElevated: '#0F1529',
  surface: '#141B33',
  surfaceRaised: '#1A2342',
  surfacePressed: '#212B4F',
  border: '#232D50',
  borderStrong: '#34406B',
  text: '#F3F5FF',
  textMuted: '#A9B3D1',
  textSubtle: '#6F7AA0',
  primary: '#8B5CF6',
  primaryMuted: 'rgba(139, 92, 246, 0.16)',
  onPrimary: '#FFFFFF',
  secondary: '#3B82F6',
  secondaryMuted: 'rgba(59, 130, 246, 0.16)',
  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.14)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerMuted: 'rgba(248, 113, 113, 0.14)',
  overlay: 'rgba(4, 7, 18, 0.72)',
  skeleton: '#1C2547',
  codeBackground: '#0A0F1F',
  codeBorder: '#1F2848',
  gradientHero: ['#3B2A7A', '#1C2A66', '#0F1A3D'],
  gradientAccent: ['#8B5CF6', '#3B82F6'],
  syntax: {
    plain: '#D6DCF5',
    keyword: '#C4A3FF',
    string: '#7EE0B5',
    number: '#FFB86B',
    comment: '#5E6A92',
    function: '#7CB6FF',
    type: '#5FD4E8',
    punctuation: '#8F9AC0',
    property: '#F0A6CA',
  },
};

const light: ThemeColors = {
  background: '#F6F7FC',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceRaised: '#F0F2FA',
  surfacePressed: '#E6E9F5',
  border: '#E1E5F2',
  borderStrong: '#C8CEE3',
  text: '#11162B',
  textMuted: '#4B5578',
  textSubtle: '#7A84A6',
  primary: '#7C3AED',
  primaryMuted: 'rgba(124, 58, 237, 0.10)',
  onPrimary: '#FFFFFF',
  secondary: '#2563EB',
  secondaryMuted: 'rgba(37, 99, 235, 0.10)',
  success: '#059669',
  successMuted: 'rgba(5, 150, 105, 0.10)',
  warning: '#B45309',
  warningMuted: 'rgba(180, 83, 9, 0.10)',
  danger: '#DC2626',
  dangerMuted: 'rgba(220, 38, 38, 0.10)',
  overlay: 'rgba(17, 22, 43, 0.45)',
  skeleton: '#E4E7F3',
  codeBackground: '#0F1428',
  codeBorder: '#1F2848',
  gradientHero: ['#7C3AED', '#4F46E5', '#2563EB'],
  gradientAccent: ['#7C3AED', '#2563EB'],
  syntax: dark.syntax,
};

export const palettes: Record<ColorScheme, ThemeColors> = { dark, light };

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  bodySmall: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  code: { fontSize: 13, lineHeight: 20, fontFamily: fonts.mono },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export function buildTheme(scheme: ColorScheme): Theme {
  return { scheme, colors: palettes[scheme], spacing, radius, typography };
}
