import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

// Safely read environment variables across Vite browser bundles, Vercel builds, and test runtimes
const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return String((import.meta as any).env[key]).trim();
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return String(process.env[key]).trim();
    }
  } catch {}
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl !== '' &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey &&
    supabaseAnonKey !== '' &&
    !supabaseAnonKey.includes('placeholder')
  );
};

// Initialize client-side Supabase client with robust persistence & URL detection
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
    console.warn('Failed to store user profile in localStorage:', err);
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
  return '';
}

/**
 * Synchronize authenticated Supabase user profile with backend storage if backend is available
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

    if (!res.ok) {
      return false;
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      await res.json();
    }
    return true;
  } catch (e) {
    // Non-blocking warning: in static deployments like Vercel frontend without serverless backend, sync is optional
    console.warn('Backend user synchronization skipped:', e);
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
 * Sign in with email and password via direct Supabase Auth
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase configuration is missing in this deployment. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project Settings > Environment Variables, and trigger a new deployment.',
    };
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user && data?.session) {
      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        name: data.user.user_metadata?.name || trimmedEmail.split('@')[0],
        token: data.session.access_token,
        avatarUrl: data.user.user_metadata?.avatar_url,
      };

      setStoredUser(userProfile);
      await syncUserWithBackend(userProfile);
      return { success: true, user: userProfile };
    }

    return { success: false, error: 'No session returned from authentication provider.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Supabase authentication failed.' };
  }
}

const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
};

/**
 * Sign up with email and password via direct Supabase Auth
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase configuration is missing in this deployment. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project Settings > Environment Variables, and trigger a new deployment.',
    };
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const displayName = name?.trim() || trimmedEmail.split('@')[0];
    const origin = getOrigin();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: displayName,
        },
        emailRedirectTo: origin ? `${origin}/dashboard` : undefined,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // In Supabase, if email confirmation is enabled and the user already exists,
    // Supabase returns a user object with an empty identities array to prevent user enumeration.
    if (data?.user?.identities && data.user.identities.length === 0) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    // Check if email confirmation is required (session is null when email confirmation is active)
    if (data?.user && !data.session) {
      return {
        success: true,
        requiresEmailConfirmation: true,
      };
    }

    // Immediate active session (when email confirmation is disabled or auto-confirmed)
    if (data?.user && data.session) {
      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        name: displayName,
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
    return { success: false, error: err?.message || 'Supabase registration failed.' };
  }
}

/**
 * Sign in with Google via direct Supabase OAuth
 */
export async function signInWithGoogle(): Promise<{ error?: string; redirected?: boolean; user?: UserProfile }> {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Supabase configuration is missing in this deployment. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project Settings > Environment Variables, and trigger a new deployment.',
    };
  }

  try {
    const origin = getOrigin();
    const redirectTo = origin ? `${origin}/dashboard` : undefined;
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
    return { error: err?.message || 'Google sign-in initiation failed.' };
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
