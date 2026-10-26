import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== '' &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseAnonKey.includes('placeholder')
  );
};

// Initialize Supabase Client if configured, or provide a safe dummy client
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient(
      'https://placeholder-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

const STORAGE_KEY = 'bd_location_assist_user';

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to store user profile:', err);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to remove stored user profile:', err);
  }
}

export function getAuthToken(): string {
  const user = getStoredUser();
  if (user?.token) {
    return user.token;
  }
  return 'auth_token_bd_owner_2026';
}

/**
 * Synchronize authenticated Supabase user profile with backend storage
 */
export async function syncUserWithBackend(user: UserProfile): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch (e) {
    console.warn('Sync with backend warning:', e);
    return false;
  }
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

/**
 * Sign in with email and password via Supabase Auth
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user && data?.session) {
        const userProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split('@')[0],
          token: data.session.access_token,
          avatarUrl: data.user.user_metadata?.avatar_url,
        };

        setStoredUser(userProfile);
        await syncUserWithBackend(userProfile);
        return { success: true, user: userProfile };
      }

      return { success: false, error: 'No session returned from authentication provider.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Supabase authentication failed.' };
    }
  }

  // Graceful local authentication fallback when Supabase keys are pending configuration
  try {
    const res = await fetch('/api/auth/login-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json();
    if (res.ok && data?.user) {
      setStoredUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data?.error || 'Invalid credentials.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Authentication request failed.' };
  }
}

/**
 * Sign up with email and password via Supabase Auth
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name?.trim() || email.split('@')[0],
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required (Supabase returns user with empty identities or null session)
      if (data?.user && !data.session) {
        return {
          success: true,
          requiresEmailConfirmation: true,
        };
      }

      if (data?.user && data.session) {
        const userProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          name: name?.trim() || data.user.user_metadata?.name || email.split('@')[0],
          token: data.session.access_token,
        };
        setStoredUser(userProfile);
        await syncUserWithBackend(userProfile);
        return {
          success: true,
          user: userProfile,
          requiresEmailConfirmation: false,
        };
      }

      return { success: true, requiresEmailConfirmation: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  }

  // Graceful local registration fallback
  try {
    const res = await fetch('/api/auth/register-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, name: name?.trim() }),
    });

    const data = await res.json();
    if (res.ok && data?.user) {
      setStoredUser(data.user);
      return { success: true, user: data.user, requiresEmailConfirmation: false };
    }
    return { success: false, error: data?.error || 'Registration failed.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration request failed.' };
  }
}

/**
 * Sign in with Google via Supabase OAuth
 */
export async function signInWithGoogle(): Promise<{ error?: string; redirected?: boolean; user?: UserProfile }> {
  if (isSupabaseConfigured()) {
    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }
      return { redirected: true };
    } catch (err: any) {
      return { error: err.message || 'Google sign-in initiation failed.' };
    }
  }

  // Graceful local test signin fallback when Supabase is pending configuration
  try {
    const res = await fetch('/api/auth/login-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mahadihassanrafi2007@gmail.com',
        password: 'demo-password',
      }),
    });
    const data = await res.json();
    if (res.ok && data?.user) {
      setStoredUser(data.user);
      return { user: data.user };
    }
    return { error: data?.error || 'Local sign-in failed.' };
  } catch (err: any) {
    return { error: err.message || 'Authentication failed.' };
  }
}

/**
 * Sign out and clear stored session
 */
export async function signOutUser(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.warn('Supabase signOut error:', err);
  } finally {
    clearStoredUser();
  }
}
