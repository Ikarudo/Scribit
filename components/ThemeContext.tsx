import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import { lightTheme, darkTheme } from '@/theme';

const THEME_STORAGE_KEY = '@scribit_theme_dark';

type ThemeContextValue = {
  isDark: boolean;
  setDarkMode: (dark: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
}

export function useIsDark(): boolean {
  const ctx = useContext(ThemeContext);
  return ctx?.isDark ?? false;
}

const { LightTheme: NavLightAdapted, DarkTheme: NavDarkAdapted } = adaptNavigationTheme({
  reactNavigationLight: NavDefaultTheme,
  reactNavigationDark: NavDarkTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});

export function useNavigationTheme() {
  const { isDark } = useAppTheme();
  return isDark ? NavDarkAdapted : NavLightAdapted;
}

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!cancelled) {
          setIsDark(stored === 'true');
        }
      } catch {
        if (!cancelled) setIsDark(false);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDarkMode = useCallback(async (dark: boolean) => {
    setIsDark(dark);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, dark ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to persist theme preference', e);
    }
  }, []);

  const paperTheme = isDark ? darkTheme : lightTheme;
  const value = useMemo<ThemeContextValue>(() => ({ isDark, setDarkMode }), [isDark, setDarkMode]);

  // Always render PaperProvider so useTheme() never runs without a theme (avoids "Property 'theme' doesn't exist").
  // Use current theme even when loading so there's no flash.
  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
