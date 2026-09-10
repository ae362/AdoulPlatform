import React, { createContext, useContext, useState, useEffect } from 'react';
import { trpc } from '../trpc';

export type UserRole =
  | 'government_authority'
  | 'national_notary_authority'
  | 'regional_adoul_council'
  | 'authentication_judge'
  | 'society_member'
  | 'creator'
  | 'notary'
  | 'president_office'
  | 'judge'
  | 'regional_judge'
  | 'supreme_judge';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
  phone?: string | null;
  court_name?: string | null;
  profile_picture_url?: string | null;
}

export interface NotaryProfile {
  appointment_decree_number: string;
  appellate_court?: string;           // محكمة الاستئناف
  primary_court?: string | null;      // المحكمة الابتدائية
  court_type: 'appellate' | 'first_instance';
  court_name: string;
  phone: string | null;
  office_address: string | null;
  profile_picture_url?: string | null;
  description?: string | null;
  jurisdiction?: string | null;
}

interface AuthContextType {
  user: User | null;
  notaryProfile: NotaryProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'auth_session_token';

const safeStorage = {
  getLocal(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setLocal(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeLocal(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
  getSession(key: string) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setSession(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeSession(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const getStoredSessionToken = () => {
  return safeStorage.getLocal(SESSION_TOKEN_KEY) || safeStorage.getSession(SESSION_TOKEN_KEY);
};

const clearStoredSessionToken = () => {
  safeStorage.removeLocal(SESSION_TOKEN_KEY);
  safeStorage.removeSession(SESSION_TOKEN_KEY);
};

const storeSessionToken = (sessionToken: string, rememberMe: boolean) => {
  if (rememberMe) {
    safeStorage.setLocal(SESSION_TOKEN_KEY, sessionToken);
    safeStorage.removeSession(SESSION_TOKEN_KEY);
  } else {
    safeStorage.setSession(SESSION_TOKEN_KEY, sessionToken);
    safeStorage.removeLocal(SESSION_TOKEN_KEY);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [notaryProfile, setNotaryProfile] = useState<NotaryProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => getStoredSessionToken());
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = trpc.auth.login.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const { data: sessionData, isLoading: sessionLoading } = trpc.auth.getSession.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, retry: false }
  );

  // Clear session if remember me expiry has passed
  useEffect(() => {
    const checkRememberMeExpiry = () => {
      const expiryTime = safeStorage.getLocal('rememberMe_expiry');
      if (expiryTime) {
        const now = new Date().getTime();
        if (now > parseInt(expiryTime)) {
          // Expiry has passed, clear everything
          clearStoredSessionToken();
          safeStorage.removeLocal('rememberMe_session');
          safeStorage.removeLocal('rememberMe_expiry');
          safeStorage.removeLocal('rememberMe_email');
          safeStorage.removeLocal('rememberMe_enabled');
          setSessionToken(null);
          setUser(null);
          setNotaryProfile(null);
        }
      }
    };

    checkRememberMeExpiry();
  }, []);

  useEffect(() => {
    if (sessionData) {
      setUser(sessionData.user);
      setNotaryProfile(sessionData.notaryProfile);
      setIsLoading(false);
    } else if (!sessionLoading && sessionToken) {
      // Session invalid, clear token so user can sign in again
      clearStoredSessionToken();
      safeStorage.removeLocal('rememberMe_session');
      safeStorage.removeLocal('rememberMe_expiry');
      setSessionToken(null);
      setUser(null);
      setNotaryProfile(null);
      setIsLoading(false);
    } else if (!sessionToken) {
      setIsLoading(false);
    }
  }, [sessionData, sessionLoading, sessionToken]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const result = await loginMutation.mutateAsync({ email, password, rememberMe });
    
    if (result.success && result.sessionToken) {
      storeSessionToken(result.sessionToken, rememberMe);
      if (rememberMe) {
        safeStorage.setLocal('rememberMe_session', 'true');
        safeStorage.setLocal('rememberMe_enabled', 'true');
        safeStorage.setLocal('rememberMe_email', email.trim());
        const expiryMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
        safeStorage.setLocal('rememberMe_expiry', String(expiryMs));
      } else {
        safeStorage.removeLocal('rememberMe_session');
        safeStorage.removeLocal('rememberMe_expiry');
      }
      setSessionToken(result.sessionToken);
      setUser(result.user);
      setNotaryProfile(result.notaryProfile);
      return result.user;
    }

    throw new Error('Login failed');
  };

  const logout = async () => {
    if (sessionToken) {
      await logoutMutation.mutateAsync({ sessionToken });
      clearStoredSessionToken();
      // Clear remember me data on logout
      safeStorage.removeLocal('rememberMe_session');
      safeStorage.removeLocal('rememberMe_expiry');
      safeStorage.removeLocal('rememberMe_email');
      safeStorage.removeLocal('rememberMe_enabled');
      setSessionToken(null);
      setUser(null);
      setNotaryProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        notaryProfile,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        sessionToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
