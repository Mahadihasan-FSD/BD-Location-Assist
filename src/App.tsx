import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Shield,
  Plus,
  Radio,
  Clock,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  X,
  Compass,
  CheckCircle,
  Menu,
  Languages,
  Layers,
  ChevronRight,
  ExternalLink,
  Home,
  LogOut,
  User,
} from 'lucide-react';
import { SharingSession, LocationTelemetry, UserProfile } from './types';
import { FindHubMap } from './components/FindHubMap';
import { CreateLinkModal } from './components/CreateLinkModal';
import { ReceiverConsentPage } from './components/ReceiverConsentPage';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { LanguageProvider, useTranslation } from './i18n';
import {
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  getAuthToken,
  signOutUser,
  supabase,
  isSupabaseConfigured,
  syncUserWithBackend,
} from './lib/supabase';
import {
  fetchUserSessions,
  fetchSessionTelemetry,
  revokeSharingSession,
} from './services/sessionService';

function AppContent() {
  const { t, language, toggleLanguage } = useTranslation();

  // Routing state
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Authenticated User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());
  const [sessions, setSessions] = useState<SharingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<LocationTelemetry | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to Supabase Auth state changes & synchronize session persistence
  useEffect(() => {
    if (isSupabaseConfigured()) {
      // 1. Initial active session check on mount
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && session?.access_token) {
          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email || 'user@bdlocationassist.com',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            token: session.access_token,
            avatarUrl: session.user.user_metadata?.avatar_url,
          };
          setStoredUser(profile);
          setCurrentUser(profile);
          syncUserWithBackend(profile);
        }
      });

      // 2. Continuous auth subscription (handles login, logout, token refresh)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
          session?.user
        ) {
          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email || 'user@bdlocationassist.com',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            token: session.access_token,
            avatarUrl: session.user.user_metadata?.avatar_url,
          };
          setStoredUser(profile);
          setCurrentUser(profile);
          await syncUserWithBackend(profile);
        } else if (event === 'SIGNED_OUT') {
          clearStoredUser();
          setCurrentUser(null);
          setSessions([]);
          setSelectedSessionId(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Route Guard: If accessing /dashboard without authentication, redirect to / with login modal
  useEffect(() => {
    if (currentPath === '/dashboard' && !currentUser) {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      setNotification(
        language === 'bn'
          ? 'ড্যাশবোর্ডে প্রবেশ করতে অনুগ্রহ করে প্রথমে সাইন ইন করুন।'
          : 'Please sign in to access the protected dashboard.'
      );
      setTimeout(() => setNotification(null), 4000);
    }
  }, [currentPath, currentUser, language]);

  // Dynamic SEO Title & Metadata Sync for SPA Navigation
  useEffect(() => {
    if (currentPath.startsWith('/share/') || currentPath === '/consent') {
      document.title =
        language === 'bn'
          ? 'সম্মতি অনুরোধ | BD Location Assist (নিরাপদ লাইভ ট্র্যাকিং)'
          : 'Consent Required | BD Location Assist (Safe Live Tracking)';
    } else if (currentPath === '/dashboard') {
      document.title =
        language === 'bn'
          ? 'লাইভ ট্র্যাকিং ড্যাশবোর্ড | BD Location Assist'
          : 'Live Tracking Dashboard | BD Location Assist';
    } else {
      document.title =
        language === 'bn'
          ? 'BD Location Assist – সম্মতিভিত্তিক লাইভ লোকেশন ট্র্যাকিং বাংলাদেশ'
          : 'BD Location Assist – Consent-Based Live GPS Tracking Bangladesh';
    }
  }, [currentPath, language]);

  // Fetch Current User Profile
  const fetchProfile = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const data = await res.json();
          if (data?.user) {
            setCurrentUser(data.user);
            setStoredUser(data.user);
          }
        }
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  };

  // Fetch All Sessions for Requester
  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const sessionList = await fetchUserSessions();
      setSessions(sessionList);

      // Auto-select first active or latest session if none selected
      if (!selectedSessionId && sessionList.length > 0) {
        const activeOne =
          sessionList.find((s) => s.status === 'SHARING' || s.status === 'PENDING_CONSENT') ||
          sessionList[0];
        setSelectedSessionId(activeOne.id);
      }
    } catch (e) {
      console.warn('Sessions fetch error:', e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Fetch Real Location Telemetry for Selected Session
  const fetchTelemetry = async (sessionId: string) => {
    try {
      const data = await fetchSessionTelemetry(sessionId);
      if (data) {
        setTelemetry(data);
      }
    } catch (e) {
      console.warn('Telemetry fetch error:', e);
    }
  };

  // Load profile & sessions if authenticated
  useEffect(() => {
    if (currentUser) {
      fetchProfile();
      fetchSessions();
    }
  }, [currentUser?.token]);

  // Poll Latest Authorized Location Telemetry Every 3.5 Seconds for active dashboard
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!selectedSessionId || currentPath !== '/dashboard') {
      setTelemetry(null);
      return;
    }

    // Immediate initial fetch
    fetchTelemetry(selectedSessionId);

    // Setup 3.5s interval polling
    pollingRef.current = setInterval(() => {
      fetchTelemetry(selectedSessionId);
    }, 3500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedSessionId, currentPath]);

  // Handle Revoke / Stop Session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const ok = await revokeSharingSession(sessionId);
      if (ok) {
        await fetchSessions();
        if (selectedSessionId === sessionId) {
          await fetchTelemetry(sessionId);
        }
        setNotification(
          language === 'bn' ? 'সেশনটি সফলভাবে বাতিল করা হয়েছে।' : 'Session successfully revoked.'
        );
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (e) {
      console.warn('Revocation failed:', e);
    }
  };

  // Handle Copy Link
  const handleCopyLink = async (invitationTokenOrUrl: string, sessionId: string) => {
    const fullUrl = invitationTokenOrUrl.startsWith('http')
      ? invitationTokenOrUrl
      : `${window.location.origin}/share/${invitationTokenOrUrl}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedSessionId(sessionId);
      setNotification(t.linkCopiedNotice);
      setTimeout(() => {
        setCopiedSessionId(null);
        setNotification(null);
      }, 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Sign out user
  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setSessions([]);
    setSelectedSessionId(null);
    setTelemetry(null);
    setIsAuthModalOpen(false);
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    setNotification(language === 'bn' ? 'সফলভাবে লগআউট করা হয়েছে।' : 'Successfully signed out.');
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle successful login
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setStoredUser(user);
    // As requested: successful login navigates directly to existing protected dashboard route
    window.history.pushState({}, '', '/dashboard');
    setCurrentPath('/dashboard');
    fetchSessions();
    setNotification(
      language === 'bn' ? `${user.name} হিসেবে সাইন ইন সম্পন্ন হয়েছে!` : `Signed in as ${user.name}!`
    );
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle successful registration
  const handleRegisterSuccess = (user?: UserProfile, requiresVerification?: boolean) => {
    // As requested: when an account is created, return to landing page
    window.history.pushState({}, '', '/');
    setCurrentPath('/');

    if (requiresVerification) {
      setRegistrationNotice(
        language === 'bn'
          ? 'নিবন্ধন সফল হয়েছে! অনুগ্রহ করে ইনবক্স চেক করে ইমেইল ভেরিফাই করুন।'
          : 'Registration successful! Please check your email to verify your account.'
      );
    } else if (user) {
      setCurrentUser(user);
      setStoredUser(user);
      setRegistrationNotice(
        language === 'bn'
          ? `স্বাগতম ${user.name}! অ্যাকাউন্ট সক্রিয় হয়েছে। ড্যাশবোর্ডে প্রবেশ করতে "শুরু করুন" চাপুন।`
          : `Welcome ${user.name}! Your account is ready. Click "Get Started" to open the dashboard.`
      );
    } else {
      setRegistrationNotice(
        language === 'bn'
          ? 'অ্যাকাউন্ট তৈরি হয়েছে! আপনি এখন লগইন করতে পারেন।'
          : 'Account created! You may now sign in.'
      );
    }

    setTimeout(() => setRegistrationNotice(null), 7000);
  };

  // -------------------------------------------------------------
  // Route 1: Recipient Consent Route Handling (/share/:token)
  // -------------------------------------------------------------
  if (currentPath.startsWith('/share/')) {
    const token = currentPath.replace('/share/', '').trim();
    return (
      <ReceiverConsentPage
        token={token}
        onNavigateHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // Route 2: Public Landing Page (Default for visitors on /)
  // -------------------------------------------------------------
  if (currentPath !== '/dashboard') {
    return (
      <>
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <LandingPage
          currentUser={currentUser}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab);
            setIsAuthModalOpen(true);
          }}
          onNavigateToDashboard={() => {
            window.history.pushState({}, '', '/dashboard');
            setCurrentPath('/dashboard');
          }}
          onLogout={handleLogout}
          registrationSuccessNotice={registrationNotice}
        />

        {/* Supabase & Email/Password Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          initialTab={authModalTab}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          onRegisterSuccess={handleRegisterSuccess}
        />
      </>
    );
  }

  // -------------------------------------------------------------
  // Route 3: Protected Requester Dashboard (/dashboard)
  // -------------------------------------------------------------
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden font-sans select-none text-slate-800">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile Drawer Trigger (Touch-friendly >= 44px) */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            aria-label="Toggle Sessions Menu"
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-slate-900 truncate">
                {t.appName}
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-100">
                {t.appBadge}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block truncate max-w-xs md:max-w-md">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls, Home Switcher, Language Toggle & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back to Public Landing Page Link */}
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
            title="Public Landing Page"
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">{language === 'bn' ? 'হোমপেজ' : 'Home'}</span>
          </button>

          {/* Language Switcher Button */}
          <button
            onClick={toggleLanguage}
            title="Switch Language (English / বাংলা)"
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Languages className="w-4 h-4 text-sky-600" />
            <span className="font-medium">{t.languageToggle}</span>
          </button>

          {/* Create Link Action */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.createLinkBtn}</span>
            <span className="sm:hidden">{t.newLinkShort}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile or Sign Out Controls */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="min-h-[40px] flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-200 text-left cursor-pointer"
                title={t.profileLogout}
              >
                <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser.name ? currentUser.name.slice(0, 2) : 'BD'}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono leading-tight truncate max-w-[130px]">
                    {currentUser.email}
                  </div>
                </div>
              </button>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthModalTab('signin');
                setIsAuthModalOpen(true);
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <span>{t.googleSignIn}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body: Desktop Sidebar + Map Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-80 sm:w-96 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
            isMobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          {/* Mobile Drawer Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between lg:hidden">
            <span className="font-bold text-sm text-slate-900">{t.activeSessions}</span>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Action & Filter */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-600" />
              {t.activeSessions} ({sessions.length})
            </span>
            <button
              onClick={fetchSessions}
              title="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
            {isLoadingSessions ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-600" />
                <p>{t.sessionsLoading}</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-xs text-slate-700">{t.noSessionsTitle}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{t.noSessionsDesc}</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {t.createFirstLink}
                </button>
              </div>
            ) : (
              sessions.map((sess) => {
                const isSelected = selectedSessionId === sess.id;
                const isRevoked = sess.status === 'REVOKED';
                const isStopped = sess.status === 'STOPPED';
                const isExpired = sess.status === 'EXPIRED';
                const isSharing = sess.status === 'SHARING';

                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setSelectedSessionId(sess.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`min-h-[64px] p-3.5 rounded-2xl transition-all cursor-pointer text-xs relative border ${
                      isSelected
                        ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-300 shadow-xs'
                        : 'bg-white border-slate-150 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`}
                          />
                          <h4 className="font-semibold text-slate-900 truncate">{sess.purpose}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {sess.sessionExpiresAt || sess.expiresAt ? (
                            <span>
                              {t.durationLabel}{' '}
                              {new Date(sess.sessionExpiresAt || sess.expiresAt!).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">
                              {t.durationUntilStopped}
                            </span>
                          )}
                        </p>
                        {sess.destinationUrl && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-mono truncate">
                            <Compass className="w-3 h-3 shrink-0 text-emerald-600" />
                            <span className="truncate">
                              {t.destinationLabel} {sess.destinationUrl}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div>
                        {isSharing ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t.liveBadge}
                          </span>
                        ) : isRevoked ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium">
                            {t.revokedBadge}
                          </span>
                        ) : isStopped ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                            {t.stoppedBadge}
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                            {t.expiredBadge}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">
                            {t.pendingBadge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Link & Revoke Controls */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">
                        ID: {sess.id.slice(0, 8)}
                      </span>

                      <div className="flex items-center gap-2">
                        {!isRevoked && !isStopped && !isExpired && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(
                                  sess.invitationToken || sess.invitationTokenHash || sess.id,
                                  sess.id
                                );
                              }}
                              title={t.copyLink}
                              className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedSessionId === sess.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  {t.copied}
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  {t.copyLink}
                                </>
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevokeSession(sess.id);
                              }}
                              title={t.revokeSession}
                              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer info */}
          <div className="p-3 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50/50">
            {t.footerSecurityNotice}
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {isMobileDrawerOpen && (
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs"
          />
        )}

        {/* Center / Right: Interactive Map Canvas */}
        <div className="flex-1 relative h-full w-full">
          {notification && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white text-xs px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{notification}</span>
            </div>
          )}

          <FindHubMap
            session={selectedSession}
            telemetry={telemetry}
            isLoading={isLoadingSessions}
          />

          {/* Floating Mobile Bottom Bar (Mobile View) */}
          <div className="lg:hidden absolute bottom-4 left-4 right-4 z-20">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 font-bold text-xs shadow-xl flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span className="truncate max-w-[200px]">
                  {selectedSession ? selectedSession.purpose : t.viewSessionsMobile}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {sessions.length} {t.sessionsCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Link Modal */}
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSessionCreated={(newSession) => {
          setSessions((prev) => [newSession, ...prev]);
          setSelectedSessionId(newSession.id);
        }}
      />

      {/* Supabase & Account Authentication Modal (Handles both Email/Password & Google) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
