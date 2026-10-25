import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { apiFetch, setStoredToken } from '../utils/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string; agreeTerms: boolean }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.token) {
          setStoredToken(data.token);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async ({ email, password, rememberMe = false }: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (payload: { name: string; email: string; password: string; confirmPassword: string; agreeTerms: boolean }) => {
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: 'Network error during registration.' };
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
