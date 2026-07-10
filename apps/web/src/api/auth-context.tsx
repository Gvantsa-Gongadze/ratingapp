import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { clearTokens, getAccessToken, saveTokens } from './token-storage';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAccessToken()));

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: (accessToken, refreshToken) => {
        saveTokens(accessToken, refreshToken);
        setIsAuthenticated(true);
      },
      logout: () => {
        clearTokens();
        // Drop any cached data (e.g. the current assignment) so it can't
        // flash on screen for the next person to use this browser.
        queryClient.clear();
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
