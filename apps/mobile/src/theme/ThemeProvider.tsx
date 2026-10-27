import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { buildTheme, type ColorScheme, type Theme } from './tokens';

export type AppearancePreference = 'dark' | 'light' | 'system';

const APPEARANCE_KEY = 'tc.appearance';

interface ThemeContextValue {
  theme: Theme;
  preference: AppearancePreference;
  setPreference: (p: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialPreference = 'dark',
}: {
  children: ReactNode;
  initialPreference?: AppearancePreference;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>(initialPreference);

  useEffect(() => {
    SecureStore.getItemAsync(APPEARANCE_KEY)
      .then((stored) => {
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback((p: AppearancePreference) => {
    setPreferenceState(p);
    SecureStore.setItemAsync(APPEARANCE_KEY, p).catch(() => undefined);
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;
  const value = useMemo(
    () => ({ theme: buildTheme(scheme), preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeProvider is missing');
  return ctx;
}

export const useTheme = () => useThemeContext().theme;
export const useAppearance = () => {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
};

type AnyStyle = ViewStyle | TextStyle | ImageStyle;
type NamedStyles<T> = { [P in keyof T]: AnyStyle };

/** Defines theme-aware styles once per module; the hook memoises them per theme. */
export function makeStyles<T extends NamedStyles<T>>(
  // The intersection gives object literals contextual typing (e.g. flexDirection: 'row').
  factory: (theme: Theme) => T & NamedStyles<Record<string, AnyStyle>>,
) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)) as T, [theme]);
  };
}
