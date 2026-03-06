import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onUnauthorized } from './api';
import { AUTH_STORAGE_KEY } from './config';

interface AuthContextValue {
  token: string | null;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(AUTH_STORAGE_KEY));

  const setToken = (nextToken: string | null) => {
    setTokenState(nextToken);
    if (nextToken) {
      localStorage.setItem(AUTH_STORAGE_KEY, nextToken);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  useEffect(() => {
    return onUnauthorized(() => {
      setTokenState(null);
    });
  }, []);

  const value = useMemo(() => ({ token, setToken }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
