import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '../types';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  verifyEmailCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: () => Promise<{ success: boolean; error?: string }>;
  cancelRegistration: () => void;
  getPendingVerification: () => { email: string; expiresAt: number } | null;
  logout: () => void;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<boolean>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email'>>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedState = authService.getAuthState();
    setAuthState(storedState);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    const result = await authService.login(email, password);
    
    if (result.success && result.user) {
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    
    setAuthState(prev => ({ ...prev, isLoading: false }));
    return { success: false, error: result.error };
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    const result = await authService.register(email, password, name);
    
    // If needs verification, don't auto-login
    if (result.success && result.needsVerification) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: true, needsVerification: true };
    }
    
    if (result.success && result.user) {
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    
    setAuthState(prev => ({ ...prev, isLoading: false }));
    return { success: false, error: result.error };
  }, []);

  const verifyEmailCode = useCallback(async (code: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    const result = await authService.verifyEmailCode(code);
    
    if (result.success && result.user) {
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    
    setAuthState(prev => ({ ...prev, isLoading: false }));
    return { success: false, error: result.error };
  }, []);

  const resendVerificationCode = useCallback(async () => {
    return await authService.resendVerificationCode();
  }, []);

  const cancelRegistration = useCallback(() => {
    authService.cancelRegistration();
  }, []);

  const getPendingVerification = useCallback(() => {
    return authService.getPendingVerification();
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<User['preferences']>) => {
    if (!authState.user) return false;
    const success = await authService.updatePreferences(authState.user.id, preferences);
    if (success) {
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, preferences: { ...prev.user.preferences, ...preferences } } : null
      }));
    }
    return success;
  }, [authState.user]);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, 'name' | 'email'>>) => {
    if (!authState.user) return { success: false, error: 'Not logged in' };
    const result = await authService.updateProfile(authState.user.id, updates);
    if (result.success) {
      const newState = authService.getAuthState();
      setAuthState(newState);
    }
    return result;
  }, [authState.user]);

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      register,
      verifyEmailCode,
      resendVerificationCode,
      cancelRegistration,
      getPendingVerification,
      logout,
      updatePreferences,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
