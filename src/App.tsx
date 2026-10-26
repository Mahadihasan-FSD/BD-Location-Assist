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
} from 'lucide-react';
import { SharingSession, LocationTelemetry, UserProfile } from './types';
import { FindHubMap } from './components/FindHubMap';
import { CreateLinkModal } from './components/CreateLinkModal';
import { ReceiverConsentPage } from './components/ReceiverConsentPage';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { LanguageProvider, useTranslation } from './i18n';

function AppContent() {
  const { t, language, toggleLanguage } = useTranslation();

  // Check if current URL is a recipient share link (/share/:token)
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Recipient Consent Route Handling
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

  // Requester Dashboard State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SharingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<LocationTelemetry | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Current User
  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer auth_token_bd_owner_2026' },
      });
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  };

  // Fetch All Sessions for Requester
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions', {
        headers: { Authorization: 'Bearer auth_token_bd_owner_2026' },
      });
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const data = await res.json();
          const sessionList: SharingSession[] = data.sessions || [];
          setSessions(sessionList);

          // Auto-select first active or latest session if none selected
          if (!selectedSessionId && sessionList.length > 0) {
            const activeOne = sessionList.find((s) => s.status === 'SHARING' || s.status === 'PENDING_CONSENT') || sessionList[0];
            setSelectedSessionId(activeOne.id);
          }
        }
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
      const res = await fetch(`/api/sessions/${sessionId}/location`, {
        headers: { Authorization: 'Bearer auth_token_bd_owner_2026' },
      });
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const data: LocationTelemetry = await res.json();
          setTelemetry(data);
        }
      }
    } catch (e) {
      console.warn('Telemetry fetch error:', e);
    }
  };

  // Initial Data Load
  useEffect(() => {
    Promise.all([fetchProfile(), fetchSessions()]);
  }, []);

  // Poll Latest Authorized Location Telemetry Every 3.5 Seconds
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!selectedSessionId) {
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
  }, [selectedSessionId]);

  // Handle Revoke / Stop Session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { Authorization: 'Bearer auth_token_bd_owner_2026' },
      });
      if (res.ok) {
        await fetchSessions();
        if (selectedSessionId === sessionId) {
          await fetchTelemetry(sessionId);
        }
        setNotification(language === 'bn' ? 'সেশনটি সফলভাবে বাতিল করা হয়েছে।' : 'Session successfully revoked.');
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
        setNotification(null), 2500;
      });
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

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
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
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

        {/* Action Controls, Language Toggle & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher Button (prominent, accessible touch target) */}
          <button
            onClick={toggleLanguage}
            title="Switch Language (English / বাংলা)"
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Languages className="w-4 h-4 text-sky-600" />
            <span className="font-medium">{t.languageToggle}</span>
          </button>

          {/* Create Link Action */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.createLinkBtn}</span>
            <span className="sm:hidden">{t.newLinkShort}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Google OAuth Profile or Sign In Button */}
          {currentUser ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="min-h-[40px] flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-200 text-left"
              title={t.profileLogout}
            >
              <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-mono leading-tight truncate max-w-[130px]">{currentUser.email}</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span className="hidden sm:inline">{t.googleSignIn}</span>
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
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
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
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
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
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t.noSessionsDesc}
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
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
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                          <h4 className="font-semibold text-slate-900 truncate">
                            {sess.purpose}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {sess.sessionExpiresAt || sess.expiresAt ? (
                            <span>
                              {t.durationLabel} {new Date(sess.sessionExpiresAt || sess.expiresAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">{t.durationUntilStopped}</span>
                          )}
                        </p>
                        {sess.destinationUrl && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-mono truncate">
                            <Compass className="w-3 h-3 shrink-0 text-emerald-600" />
                            <span className="truncate">{t.destinationLabel} {sess.destinationUrl}</span>
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

                    {/* Quick Link & Revoke Controls (Touch targets >= 44px) */}
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
                                handleCopyLink(sess.invitationToken || sess.invitationTokenHash || sess.id, sess.id);
                              }}
                              title={t.copyLink}
                              className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
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
                              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
              className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 font-bold text-xs shadow-xl flex items-center justify-between"
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

      {/* Google OAuth & Account Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          fetchSessions();
          setNotification(language === 'bn' ? `${user.name} হিসেবে সাইন-ইন সম্পন্ন হয়েছে!` : `Signed in as ${user.name}!`);
          setTimeout(() => setNotification(null), 3000);
        }}
        onLogout={() => {
          setCurrentUser(null);
          setSessions([]);
          setSelectedSessionId(null);
          setTelemetry(null);
          setIsAuthModalOpen(false);
          setNotification(language === 'bn' ? 'লগআউট করা হয়েছে।' : 'Logged out.');
          setTimeout(() => setNotification(null), 3000);
        }}
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
