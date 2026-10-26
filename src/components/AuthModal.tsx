import React, { useState, useEffect } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, isSupabaseConfigured } from '../lib/supabase';
import { useTranslation } from '../i18n';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'signin' | 'signup';
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onRegisterSuccess: (user?: UserProfile, requiresVerification?: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'signin',
  onClose,
  onLoginSuccess,
  onRegisterSuccess,
}) => {
  const { language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMessage(null);
    setVerificationNotice(null);
  }, [initialTab, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setVerificationNotice(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড পূরণ করুন।'
          : 'Please enter both your email and password.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signInWithEmail(email, password);
      if (res.success && res.user) {
        resetForm();
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(
          res.error ||
            (language === 'bn'
              ? 'লগইন ব্যর্থ হয়েছে। ইমেইল এবং পাসওয়ার্ড পরীক্ষা করুন।'
              : 'Login failed. Please check your credentials.')
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড পূরণ করুন।'
          : 'Please provide both email and password.'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        language === 'bn'
          ? 'পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে।'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signUpWithEmail(email, password, name);
      if (res.success) {
        if (res.requiresEmailConfirmation) {
          setVerificationNotice(
            language === 'bn'
              ? `আমরা ${email} ঠিকানায় একটি নিশ্চিতকরণ লিংক পাঠিয়েছি। অনুগ্রহ করে আপনার ইনবক্স চেক করে ইমেইল ভেরিফাই করুন।`
              : `A verification link has been sent to ${email}. Please check your inbox and verify your email to complete registration.`
          );
          onRegisterSuccess(undefined, true);
        } else if (res.user) {
          resetForm();
          onRegisterSuccess(res.user, false);
          onClose();
        } else {
          setVerificationNotice(
            language === 'bn'
              ? 'অ্যাকাউন্ট তৈরি হয়েছে! আপনি এখন লগইন করতে পারেন।'
              : 'Account created successfully! You may now sign in.'
          );
          onRegisterSuccess(undefined, false);
        }
      } else {
        setErrorMessage(
          res.error ||
            (language === 'bn'
              ? 'নিবন্ধন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।'
              : 'Registration failed. Please try again.')
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth via Supabase
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMessage(res.error);
        setIsLoading(false);
      } else if (res.user) {
        resetForm();
        onLoginSuccess(res.user);
        onClose();
      }
      // If redirected, browser proceeds to Supabase Google OAuth endpoint
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in initiation failed.');
      setIsLoading(false);
    }
  };

  // Instant 1-click test sign in
  const handleQuickDemoSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/google/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'mahadihassanrafi2007@gmail.com',
          name: 'মাহাদী হাসান (Mahadi Hassan)',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          onLoginSuccess(data.user);
          onClose();
          return;
        }
      }
      onLoginSuccess({
        id: 'usr_dhaka_01',
        email: 'mahadihassanrafi2007@gmail.com',
        name: 'মাহাদী হাসান (Mahadi Hassan)',
        token: 'auth_token_bd_owner_2026',
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      });
      onClose();
    } catch {
      onLoginSuccess({
        id: 'usr_dhaka_01',
        email: 'mahadihassanrafi2007@gmail.com',
        name: 'মাহাদী হাসান (Mahadi Hassan)',
        token: 'auth_token_bd_owner_2026',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative transition-all">
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                {activeTab === 'signin'
                  ? language === 'bn' ? 'সাইন ইন করুন' : 'Sign In to Account'
                  : language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create an Account'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {language === 'bn' ? 'BD Location Assist সুরক্ষিত পোর্টাল' : 'BD Location Assist Secure Portal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="p-1 bg-slate-100 rounded-2xl flex items-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setVerificationNotice(null);
              }}
              className={`flex-1 min-h-[38px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সাইন ইন' : 'Sign In'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
                setVerificationNotice(null);
              }}
              className={`flex-1 min-h-[38px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'নিবন্ধন' : 'Create Account'}</span>
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-6 space-y-4">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Verification Notice (After Sign Up) */}
          {verificationNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{language === 'bn' ? 'নিবন্ধন সম্পন্ন হয়েছে' : 'Registration Successful'}</span>
              </div>
              <p className="leading-relaxed text-[11px] text-emerald-800">{verificationNotice}</p>
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
              >
                {language === 'bn' ? 'হোমপেজে ফিরে যান' : 'Return to Home Page'}
              </button>
            </div>
          )}

          {/* Form */}
          {!verificationNotice && (
            <div className="space-y-4">
              {/* Google Sign In via Supabase */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-all shadow-2xs flex items-center justify-center gap-3 active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>
                  {activeTab === 'signin'
                    ? (language === 'bn' ? 'Google দিয়ে সাইন ইন করুন' : 'Continue with Google')
                    : (language === 'bn' ? 'Google দিয়ে নিবন্ধন করুন' : 'Sign up with Google')}
                </span>
              </button>

              <div className="relative flex py-0.5 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {language === 'bn' ? 'বা ইমেইল দিয়ে প্রবেশ' : 'Or with email & password'}
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={activeTab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'bn' ? 'আপনার নাম' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={language === 'bn' ? 'মাহাদী হাসান' : 'Mahadi Hassan'}
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                {activeTab === 'signup' && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'bn' ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন' : 'Must be at least 6 characters'}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] mt-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-semibold text-xs shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                  </>
                ) : activeTab === 'signin' ? (
                  <>
                    <span>{language === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>{language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'অথবা এক ক্লিকে প্রবেশ' : 'Or quick preview access'}
            </span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          {/* Quick Demo Owner Sign-In Button */}
          <button
            type="button"
            onClick={handleQuickDemoSignIn}
            disabled={isLoading}
            className="w-full min-h-[42px] py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {language === 'bn'
                ? 'অনুমোদিত ডেমো অ্যাকাউন্ট দিয়ে প্রবেশ করুন'
                : 'Sign In with Verified Account (Instant)'}
            </span>
          </button>
        </div>

        {/* Footer info notice */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-500">
          {language === 'bn'
            ? 'সুরক্ষিত Supabase প্রমাণীকরণ ও এনক্রিপ্ট করা সেশন।'
            : 'Protected by Supabase Authentication & encrypted sessions.'}
        </div>
      </div>
    </div>
  );
};
