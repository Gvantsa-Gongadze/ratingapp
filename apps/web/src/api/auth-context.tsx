import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  const clearSession = useCallback(() => {
    // Drop any cached data (e.g. the current assignment) so it can't
    // flash on screen for the next person to use this browser.
    queryClient.clear();
    setIsAuthenticated(false);
  }, [queryClient]);

  useEffect(() => {
    // Fired by apiFetch when a request comes back 401 (expired/invalid
    // access token), so the nav reflects reality even though the logout
    // didn't originate from the "Log out" button.
    window.addEventListener('auth:logout', clearSession);
    return () => window.removeEventListener('auth:logout', clearSession);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: (accessToken, refreshToken) => {
        saveTokens(accessToken, refreshToken);
        setIsAuthenticated(true);
      },
      logout: () => {
        clearTokens();
        clearSession();
      },
    }),
    [isAuthenticated, clearSession],
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
