import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  Radio,
  StopCircle,
  RefreshCw,
  Compass,
  Lock,
  ExternalLink,
  Languages,
} from 'lucide-react';
import { InvitationDetails, ReceiverGrant } from '../types';
import { useTranslation } from '../i18n';

interface ReceiverConsentPageProps {
  token: string;
  onNavigateHome: () => void;
}

export const ReceiverConsentPage: React.FC<ReceiverConsentPageProps> = ({
  token,
  onNavigateHome,
}) => {
  const { t, language, toggleLanguage } = useTranslation();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consent & Sharing States
  const [consentGranted, setConsentGranted] = useState(false);
  const [grant, setGrant] = useState<ReceiverGrant | null>(null);
  const [isRejected, setIsRejected] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | null>(null);

  // Live Location Telemetry State (Real GPS only)
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isSharingStopped, setIsSharingStopped] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // 1. Validate Invitation with Backend on Load
  useEffect(() => {
    async function validateToken() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (!res.ok) {
          let errMsg = t.invitationUnavailableTitle;
          try {
            const ct = res.headers.get('content-type');
            if (ct && ct.includes('application/json')) {
              const errData = await res.json();
              errMsg = errData.error || errMsg;
            }
          } catch {}
          setError(errMsg);
          return;
        }

        const data = await res.json();
        setInvitation(data);
      } catch (err: any) {
        setError(language === 'bn' ? 'সার্ভারে যোগাযোগ করতে ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।' : 'Failed to reach server. Please check internet connection.');
      } finally {
        setIsLoading(false);
      }
    }

    validateToken();

    // Clean up geolocation watch on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [token, language]);

  // 2. Transmit Real Location Fix to Backend
  const transmitLocation = async (
    pos: GeolocationPosition,
    grantToken: string,
    sessionId: string
  ) => {
    setIsTransmitting(true);
    try {
      const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;

      await fetch(`/api/sessions/${sessionId}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Grant-Token': grantToken,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracyMeters: accuracy,
          altitudeMeters: altitude ?? undefined,
          speed: speed ?? undefined,
          heading: heading ?? undefined,
          recordedAt: new Date(pos.timestamp).toISOString(),
        }),
      });

      setCurrentCoords({
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        timestamp: pos.timestamp,
      });
      setUpdateCount((c) => c + 1);
    } catch (e) {
      console.warn('Location transmission failed:', e);
    } finally {
      setIsTransmitting(false);
    }
  };

  // 3. Request Native Browser Geolocation & Setup Continuous Watch
  const requestNativeLocation = (grantToken: string, sessionId: string) => {
    if (!navigator.geolocation) {
      setError(language === 'bn' ? 'আপনার ব্রাউজার জিপিএস লোকেশন সমর্থন করে না।' : 'Your browser does not support geolocation.');
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionState('granted');
        transmitLocation(pos, grantToken, sessionId);

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          (livePos) => {
            transmitLocation(livePos, grantToken, sessionId);
          },
          (err) => {
            console.warn('Geolocation watch error:', err);
          },
          geoOptions
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState('denied');
        } else {
          setError(`${language === 'bn' ? 'জিপিএস সংকেত পেতে ব্যর্থ' : 'Failed to obtain GPS signal'}: ${err.message}`);
        }
      },
      geoOptions
    );
  };

  // 4. Handle Explicit Accept Consent (Streamlined: No redundant dialog!)
  const handleAcceptConsent = async () => {
    if (!invitation) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/invitations/${token}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true }),
      });

      if (!res.ok) {
        let errMsg = 'Failed to save consent.';
        try {
          const ct = res.headers.get('content-type');
          if (ct && ct.includes('application/json')) {
            const errData = await res.json();
            errMsg = errData.error || errData.message || errMsg;
          }
        } catch {}
        throw new Error(errMsg);
      }

      const data: ReceiverGrant = await res.json();
      if (!data.consented) {
        throw new Error(data.message || 'Failed to save consent.');
      }

      setGrant(data);
      setConsentGranted(true);

      // Trigger native browser Geolocation immediately
      requestNativeLocation(data.grantToken, data.sessionId);

      // If destination URL exists, open it in a new tab immediately
      if (invitation.destinationUrl) {
        try {
          window.open(invitation.destinationUrl, '_blank', 'noopener,noreferrer');
        } catch (popupErr) {
          console.warn('Window popup blocked:', popupErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Handle Explicit Reject
  const handleRejectConsent = async () => {
    try {
      await fetch(`/api/invitations/${token}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: false }),
      });
    } catch (e) {
      // ignore
    }
    setIsRejected(true);
  };

  // 6. Stop Sharing Voluntarily by Recipient
  const handleStopSharing = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (grant) {
      try {
        await fetch(`/api/grants/${grant.grantId}/stop`, {
          method: 'POST',
          headers: { 'X-Grant-Token': grant.grantToken },
        });
      } catch (e) {
        console.warn(e);
      }
    }

    setIsSharingStopped(true);
  };

  // Render: Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-800">{t.invitationVerifyingTitle}</h3>
          <p className="text-xs text-slate-500">{t.invitationVerifyingDesc}</p>
        </div>
      </div>
    );
  }

  // Render: Error / Revoked / Expired Screen
  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t.invitationUnavailableTitle}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
          <button
            onClick={onNavigateHome}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            {t.returnHomeBtn}
          </button>
        </div>
      </div>
    );
  }

  // Render: Recipient Explicitly Rejected
  if (isRejected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t.rejectedTitle}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{t.rejectedDesc}</p>
          <button
            onClick={onNavigateHome}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    );
  }

  // Render: Sharing Stopped Voluntarily
  if (isSharingStopped) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <StopCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t.stoppedTitle}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{t.stoppedDesc}</p>
          <button
            onClick={onNavigateHome}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            {t.returnHomeBtn}
          </button>
        </div>
      </div>
    );
  }

  // Render: Browser Location Permission Denied Warning
  if (permissionState === 'denied') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t.permissionDeniedTitle}</h3>
          <p className="text-xs text-slate-600 leading-relaxed text-left">
            {t.permissionDeniedDesc}
          </p>
          <ul className="text-left text-xs text-slate-600 list-disc list-inside space-y-1 bg-slate-50 p-3.5 rounded-2xl">
            <li>{t.permissionDeniedStep1}</li>
            <li>{t.permissionDeniedStep2}</li>
            <li>{t.permissionDeniedStep3}</li>
            <li>{t.permissionDeniedStep4}</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-xs hover:bg-sky-500 transition-colors shadow-md"
          >
            {t.refreshBtn}
          </button>
        </div>
      </div>
    );
  }

  // Render: Active Sharing Dashboard (Consent Given & GPS Active)
  if (consentGranted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 -ml-5.5" />
              <h3 className="text-sm font-bold text-slate-900">
                {t.trackingActiveTitle}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              {t.activeStatusBadge}
            </span>
          </div>

          {/* Destination Notification Banner if Smart Destination was triggered */}
          {invitation.destinationUrl && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
              <div className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">
                  {t.destinationOpenedNotice}
                </p>
              </div>
              <a
                href={invitation.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t.openDestinationBtn}
              </a>
            </div>
          )}

          {/* Context Info */}
          <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-400">{t.requesterLabel}</span>
              <span className="font-semibold text-slate-800">{invitation.requesterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.purposeCardLabel}</span>
              <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                {invitation.purpose}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.durationCardLabel}</span>
              <span className="font-semibold text-sky-800">
                {invitation.durationMinutes && invitation.expiresAt
                  ? `${t.durationCardExpiresAt} ${new Date(invitation.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : t.durationCardForever}
              </span>
            </div>
          </div>

          {/* Real Telemetry Box */}
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between text-sky-900 font-sans font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-sky-600" />
                GPS:
              </span>
              <span>{isTransmitting ? t.gpsStatusUploading : t.gpsStatusConnected}</span>
            </div>

            {currentCoords ? (
              <div className="space-y-1.5 text-slate-700 text-[11px] pt-1 border-t border-sky-200/60">
                <div className="flex justify-between">
                  <span>{t.coordinates}</span>
                  <span className="font-bold text-slate-900">
                    {currentCoords.latitude.toFixed(5)}°, {currentCoords.longitude.toFixed(5)}°
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t.accuracy}</span>
                  <span
                    className={`font-bold ${
                      currentCoords.accuracy < 30
                        ? 'text-emerald-700'
                        : currentCoords.accuracy <= 100
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    ±{currentCoords.accuracy} m
                    <span className="font-sans font-normal ml-1">
                      {currentCoords.accuracy < 30 ? t.highAccuracy : currentCoords.accuracy <= 100 ? t.medAccuracy : t.lowAccuracy}
                    </span>
                  </span>
                </div>

                {currentCoords.accuracy > 100 && (
                  <div className="text-[10px] font-sans text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 leading-tight">
                    {t.poorAccuracyWarning}
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-500 text-[10px] pt-1 font-sans">
                  <span>{t.uploadCountLabel} {updateCount}</span>
                  <button
                    type="button"
                    onClick={() => grant && requestNativeLocation(grant.grantToken, grant.sessionId)}
                    className="min-h-[36px] px-2.5 py-1 bg-white border border-sky-200 hover:bg-sky-100 rounded-lg text-sky-700 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t.newGpsFixBtn}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-slate-500 font-sans text-xs">
                {t.gpsSeeking}
              </div>
            )}
          </div>

          {/* Prominent Accessible STOP SHARING Button */}
          <div className="pt-2">
            <button
              onClick={handleStopSharing}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              <StopCircle className="w-4 h-4" />
              {t.stopSharingBtn}
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-2">
              {t.stopSharingNotice}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render: Initial Consent Explanation Screen (Prior to Location Access)
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
        {/* Top bar with Branding & Language Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.appName}</h2>
              <p className="text-xs text-slate-500">{t.consentRequestSubtitle}</p>
            </div>
          </div>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Languages className="w-3.5 h-3.5 text-sky-600" />
            <span>{t.languageToggle}</span>
          </button>
        </div>

        {/* Requester & Purpose Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{t.requesterLabel} <strong>{invitation.requesterName}</strong></span>
          </div>

          <div className="flex items-start gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-500">{t.purposeCardLabel}</span>
              <p className="font-semibold text-slate-900 mt-0.5">{invitation.purpose}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              {t.durationCardLabel}{' '}
              <strong>
                {invitation.durationMinutes
                  ? `${invitation.durationMinutes} ${language === 'bn' ? 'মিনিট' : 'minutes'}`
                  : t.durationCardForever}
              </strong>
            </span>
          </div>
        </div>

        {/* Smart Destination Link Preview if attached */}
        {invitation.destinationUrl && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <Compass className="w-4 h-4 text-emerald-600" />
              {t.smartDestCardTitle}
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              {t.smartDestCardDesc}
            </p>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2 text-[11px] font-mono text-emerald-800">
              <span className="truncate max-w-[280px]">{invitation.destinationUrl}</span>
              <a
                href={invitation.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-emerald-600 hover:text-emerald-800 rounded"
                title="Direct link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Clear Data Disclosure (Transparency Policy) */}
        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs text-slate-700 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-sky-950">
            <Lock className="w-4 h-4 text-sky-600" />
            {t.whatDataTitle}
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
            <li>{t.whatData1}</li>
            <li>{t.whatData2}</li>
            <li>{t.whatData3}</li>
          </ul>
        </div>

        {/* Action Buttons (Touch targets >= 44px) */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleAcceptConsent}
            className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-bold text-xs transition-all shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            {invitation.destinationUrl ? t.approveAndOpenDestBtn : t.approveAndShareBtn}
          </button>

          {invitation.destinationUrl ? (
            <a
              href={invitation.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-emerald-200"
            >
              {t.directVisitWithoutShare}
            </a>
          ) : (
            <button
              onClick={handleRejectConsent}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              {t.rejectBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
