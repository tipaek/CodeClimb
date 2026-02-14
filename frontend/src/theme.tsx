import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const THEME_STORAGE_KEY = 'codeclimb.theme';

export const THEME_OPTIONS = [
  { id: 'salt-pepper', label: 'Salt & Pepper' },
  { id: 'fresh-peach', label: 'Fresh Peach' },
  { id: 'wisteria-bloom', label: 'Wisteria Bloom' },
  { id: 'night-sands', label: 'Night Sands' },
] as const;

export type ThemeId = (typeof THEME_OPTIONS)[number]['id'];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.some((item) => item.id === stored) ? (stored as ThemeId) : 'salt-pepper';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
