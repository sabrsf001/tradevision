import { User, AuthState } from '../types';

const STORAGE_KEY = 'tv_auth';
const USERS_KEY = 'tv_users';
const PENDING_VERIFICATION_KEY = 'tv_pending_verification';

// Type for pending verification
interface PendingVerification {
  email: string;
  password: string;
  name: string;
  code: string;
  expiresAt: number;
  createdAt: number;
}

// Simulated user database using localStorage
const getStoredUsers = (): Record<string, { password: string; user: User }> => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : {};
};

const saveStoredUsers = (users: Record<string, { password: string; user: User }>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Get pending verification
const getPendingVerification = (): PendingVerification | null => {
  const stored = localStorage.getItem(PENDING_VERIFICATION_KEY);
  if (!stored) return null;
  const pending = JSON.parse(stored);
  // Check if expired (10 minutes)
  if (Date.now() > pending.expiresAt) {
    localStorage.removeItem(PENDING_VERIFICATION_KEY);
    return null;
  }
  return pending;
};

// Save pending verification
const savePendingVerification = (pending: PendingVerification) => {
  localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(pending));
};

// Clear pending verification
const clearPendingVerification = () => {
  localStorage.removeItem(PENDING_VERIFICATION_KEY);
};

// Generate 6-digit verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Simple hash function for demo (in production, use proper hashing)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Simulate sending email (in production, use real email service like EmailJS, SendGrid, etc.)
const sendVerificationEmail = async (email: string, code: string): Promise<boolean> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In a real app, you would send an actual email here
  // For demo, we'll show the code in the console
  console.log(`📧 Verification code for ${email}: ${code}`);
  
  // Also show a native browser notification if possible
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('TradeVision Verification Code', {
      body: `Your code is: ${code}`,
      icon: '/favicon.ico'
    });
  }
  
  return true;
};

export const authService = {
  // Get current auth state from localStorage
  getAuthState: (): AuthState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      return { ...state, isLoading: false };
    }
    return { user: null, isAuthenticated: false, isLoading: false };
  },

  // Get pending verification (for UI to check if there's a pending registration)
  getPendingVerification: (): { email: string; expiresAt: number } | null => {
    const pending = getPendingVerification();
    if (!pending) return null;
    return { email: pending.email, expiresAt: pending.expiresAt };
  },

  // Start registration - sends verification code
  startRegistration: async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users = getStoredUsers();
    
    // Check if email exists
    if (users[email.toLowerCase()]) {
      return { success: false, error: 'Email already registered' };
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email address' };
    }

    // Validate password
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Generate verification code
    const code = generateVerificationCode();
    
    // Save pending verification (expires in 10 minutes)
    const pending: PendingVerification = {
      email: email.toLowerCase(),
      password: simpleHash(password),
      name: name || email.split('@')[0],
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      createdAt: Date.now()
    };
    savePendingVerification(pending);

    // Send verification email
    await sendVerificationEmail(email, code);

    return { success: true };
  },

  // Verify email code and complete registration
  verifyEmailCode: async (code: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const pending = getPendingVerification();
    
    if (!pending) {
      return { success: false, error: 'Verification expired. Please register again.' };
    }

    if (pending.code !== code) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Check if email was registered while waiting
    const users = getStoredUsers();
    if (users[pending.email]) {
      clearPendingVerification();
      return { success: false, error: 'Email already registered' };
    }

    // Create new user
    const user: User = {
      id: Date.now().toString(),
      email: pending.email,
      name: pending.name,
      plan: 'free',
      createdAt: new Date().toISOString(),
      emailVerified: true,
      preferences: {
        theme: 'dark',
        defaultTimeframe: '1D',
        notifications: true,
      }
    };

    // Save user
    users[pending.email] = {
      password: pending.password,
      user
    };
    saveStoredUsers(users);

    // Clear pending verification
    clearPendingVerification();

    // Auto-login after verification
    const authState: AuthState = { user, isAuthenticated: true, isLoading: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));

    return { success: true, user };
  },

  // Resend verification code
  resendVerificationCode: async (): Promise<{ success: boolean; error?: string }> => {
    const pending = getPendingVerification();
    
    if (!pending) {
      return { success: false, error: 'No pending verification. Please register again.' };
    }

    // Generate new code
    const newCode = generateVerificationCode();
    pending.code = newCode;
    pending.expiresAt = Date.now() + 10 * 60 * 1000; // Reset expiry
    savePendingVerification(pending);

    // Send new code
    await sendVerificationEmail(pending.email, newCode);

    return { success: true };
  },

  // Cancel pending registration
  cancelRegistration: (): void => {
    clearPendingVerification();
  },

  // Register new user (legacy - now redirects to startRegistration)
  register: async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; user?: User; needsVerification?: boolean }> => {
    const result = await authService.startRegistration(email, password, name);
    if (result.success) {
      return { success: true, needsVerification: true };
    }
    return result;
  },

  // Login user
  login: async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const users = getStoredUsers();
    const stored = users[email.toLowerCase()];

    if (!stored) {
      return { success: false, error: 'Email not found' };
    }

    if (stored.password !== simpleHash(password)) {
      return { success: false, error: 'Incorrect password' };
    }

    // Update last login
    stored.user.lastLoginAt = new Date().toISOString();
    saveStoredUsers(users);

    const authState: AuthState = { user: stored.user, isAuthenticated: true, isLoading: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));

    return { success: true, user: stored.user };
  },

  // Logout user
  logout: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Update user preferences
  updatePreferences: async (userId: string, preferences: Partial<User['preferences']>): Promise<boolean> => {
    const authState = authService.getAuthState();
    if (!authState.user || authState.user.id !== userId) return false;

    const users = getStoredUsers();
    const stored = users[authState.user.email];
    if (!stored) return false;

    stored.user.preferences = { ...stored.user.preferences, ...preferences };
    saveStoredUsers(users);

    const newAuthState: AuthState = { 
      user: stored.user, 
      isAuthenticated: true, 
      isLoading: false 
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuthState));

    return true;
  },

  // Update user profile
  updateProfile: async (userId: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<{ success: boolean; error?: string }> => {
    const authState = authService.getAuthState();
    if (!authState.user || authState.user.id !== userId) {
      return { success: false, error: 'Not authorized' };
    }

    const users = getStoredUsers();
    const oldEmail = authState.user.email;
    const stored = users[oldEmail];
    if (!stored) return { success: false, error: 'User not found' };

    // If email changed, check if new email exists
    if (updates.email && updates.email.toLowerCase() !== oldEmail) {
      if (users[updates.email.toLowerCase()]) {
        return { success: false, error: 'Email already in use' };
      }
      // Remove old email entry
      delete users[oldEmail];
      stored.user.email = updates.email.toLowerCase();
      users[updates.email.toLowerCase()] = stored;
    }

    if (updates.name) {
      stored.user.name = updates.name;
    }

    saveStoredUsers(users);

    const newAuthState: AuthState = { 
      user: stored.user, 
      isAuthenticated: true, 
      isLoading: false 
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuthState));

    return { success: true };
  },

  // Upgrade plan
  upgradePlan: async (userId: string, plan: 'pro' | 'premium'): Promise<boolean> => {
    const authState = authService.getAuthState();
    if (!authState.user || authState.user.id !== userId) return false;

    const users = getStoredUsers();
    const stored = users[authState.user.email];
    if (!stored) return false;

    stored.user.plan = plan;
    stored.user.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
    saveStoredUsers(users);

    const newAuthState: AuthState = { 
      user: stored.user, 
      isAuthenticated: true, 
      isLoading: false 
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuthState));

    return true;
  }
};
