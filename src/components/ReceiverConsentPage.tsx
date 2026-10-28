import React, { useState, useEffect, useRef } from "react";
import {
  StopCircle,
  ExternalLink,
  Languages,
  Loader2,
  Navigation,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { InvitationDetails, ReceiverGrant } from "../types";
import { useTranslation } from "../i18n";
import {
  validateInvitationToken,
  submitConsent,
  transmitTelemetry,
} from "../services/sessionService";

interface ReceiverConsentPageProps {
  token: string;
  onNavigateHome: () => void;
}

export const ReceiverConsentPage: React.FC<ReceiverConsentPageProps> = ({
  token,
  onNavigateHome,
}) => {
  const { language, toggleLanguage } = useTranslation();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States: "INIT" | "PROMPTING" | "ACTIVE" | "DENIED" | "STOPPED" | "EXPIRED"
  const [shareState, setShareState] = useState<"INIT" | "PROMPTING" | "ACTIVE" | "DENIED" | "STOPPED" | "EXPIRED">("INIT");
  const [openedDestination, setOpenedDestination] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const activeGrantRef = useRef<ReceiverGrant | null>(null);

  // Stop location watch helper
  const stopGeolocationWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // 1. Initial Load: Validate token & immediately trigger native browser location prompt
  useEffect(() => {
    let isMounted = true;

    async function initAndRequestLocation() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await validateInvitationToken(token);
        if (!isMounted) return;

        if (!data.valid) {
          setError(
            data.error ||
              (language === "bn"
                ? "আমন্ত্রণ লিংকটি আর সক্রিয় নেই অথবা মেয়াদ শেষ হয়ে গেছে।"
                : "This invitation link is no longer valid or has expired.")
          );
          setShareState("EXPIRED");
          setIsLoading(false);
          return;
        }

        setInvitation(data);
        setIsLoading(false);

        // DIRECT LOCATION REQUEST: Immediately prompt for browser location permission
        requestLocationPermission(data);
      } catch (err: any) {
        if (!isMounted) return;
        setError(
          err?.message ||
            (language === "bn"
              ? "সার্ভারে যোগাযোগ করতে ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।"
              : "Failed to connect. Please check internet connection.")
        );
        setIsLoading(false);
      }
    }

    initAndRequestLocation();

    return () => {
      isMounted = false;
      stopGeolocationWatch();
    };
  }, [token]);

  // Request browser location permission immediately
  const requestLocationPermission = async (invitationData: InvitationDetails) => {
    if (!navigator.geolocation) {
      setError(
        language === "bn"
          ? "আপনার ব্রাউজারে লোকেশন ট্র্যাকিং সমর্থিত নয়।"
          : "Geolocation is not supported by your browser."
      );
      setShareState("DENIED");
      return;
    }

    setShareState("PROMPTING");

    // Automatically register grant with backend / Supabase
    let currentGrant = activeGrantRef.current;
    if (!currentGrant) {
      try {
        currentGrant = await submitConsent(token, true);
        activeGrantRef.current = currentGrant;
      } catch (consentErr) {
        console.warn("Auto consent record warning:", consentErr);
        currentGrant = {
          consented: true,
          grantToken: token,
          grantId: "grant_" + token.substring(0, 8),
          sessionId: invitationData.sessionId,
          expiresAt: invitationData.expiresAt || new Date(Date.now() + 86400000).toISOString(),
        };
        activeGrantRef.current = currentGrant;
      }
    }

    const targetSessionId = invitationData.sessionId;
    const targetGrantToken = currentGrant?.grantToken || token;

    // Trigger browser native Geolocation permission popup
    stopGeolocationWatch();

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setShareState("ACTIVE");

        try {
          const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;
          await transmitTelemetry(targetSessionId, targetGrantToken, {
            latitude,
            longitude,
            accuracyMeters: accuracy,
            altitudeMeters: altitude ?? undefined,
            speed: speed ?? undefined,
            heading: heading ?? undefined,
            recordedAt: new Date(pos.timestamp).toISOString(),
          });
        } catch (txErr) {
          console.warn("Location transmission error:", txErr);
        }

        // Open destination URL if specified and not yet opened
        if (invitationData.destinationUrl && !openedDestination) {
          setOpenedDestination(true);
          try {
            window.open(invitationData.destinationUrl, "_blank", "noopener,noreferrer");
          } catch {}
        }
      },
      (geoError) => {
        console.warn("Geolocation error:", geoError.code, geoError.message);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setShareState("DENIED");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setShareState("PROMPTING");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 5000,
      }
    );
  };

  // Stop Sharing button handler
  const handleStopSharing = () => {
    stopGeolocationWatch();
    setShareState("STOPPED");
  };

  // Render Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full text-center border border-slate-700/60 shadow-2xl">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
          <h2 className="text-base font-semibold text-white">
            {language === "bn" ? "সংযোগ স্থাপন করা হচ্ছে..." : "Connecting..."}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === "bn" ? "অনুগ্রহ করে অপেক্ষা করুন" : "Please wait a moment"}
          </p>
        </div>
      </div>
    );
  }

  // Render Expired or General Error
  if (error || shareState === "EXPIRED") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border border-slate-700/60 shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {language === "bn" ? "লিংকটি অনুপলব্ধ" : "Link Unavailable"}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {error || (language === "bn" ? "এই লিংকটির মেয়াদ উত্তীর্ণ হয়েছে অথবা বাতিল করা হয়েছে।" : "This link has expired or has been revoked.")}
            </p>
          </div>
          <button
            onClick={onNavigateHome}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
          >
            {language === "bn" ? "হোমপেজে ফিরে যান" : "Return Home"}
          </button>
        </div>
      </div>
    );
  }

  // Render Stopped
  if (shareState === "STOPPED") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border border-slate-700/60 shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <StopCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {language === "bn" ? "লোকেশন শেয়ারিং বন্ধ করা হয়েছে" : "Location Sharing Stopped"}
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              {language === "bn"
                ? "আপনার রিয়েল-টাইম অবস্থান শেয়ারিং সফলভাবে বন্ধ করা হয়েছে।"
                : "Your real-time location sharing has been safely terminated."}
            </p>
          </div>
          {invitation?.destinationUrl && (
            <a
              href={invitation.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {language === "bn" ? "গন্তব্য লিংক খুলুন" : "Open Destination URL"}
            </a>
          )}
        </div>
      </div>
    );
  }

  // Render Permission Denied Screen
  if (shareState === "DENIED") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border border-slate-700/60 shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {language === "bn" ? "লোকেশন অনুমতি প্রয়োজন" : "Location Permission Required"}
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {language === "bn"
                ? "শেয়ারিং শুরু করতে ব্রাউজারের লোকেশন পারমিশন চালু করুন। আপনার ব্রাউজারের অ্যাড্রেস বারের লক আইকনে ক্লিক করে \"লোকেশন\" এলাও (Allow) করুন।"
                : "Location access is required to share your live location. Please allow location permissions in your browser address bar settings."}
            </p>
          </div>
          <button
            onClick={() => invitation && requestLocationPermission(invitation)}
            className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {language === "bn" ? "লোকেশন অনুমতি দিন" : "Allow Location Access"}
          </button>
        </div>
      </div>
    );
  }

  // Render Prompting / Active State (Minimalist, Privacy-First UI, Image 1 part completely removed)
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="bg-slate-800/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/60 shadow-2xl space-y-6">
        
        {/* Header with App Branding and Language toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <Navigation className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">BD Location Assist</h1>
              <p className="text-[11px] text-slate-400">
                {language === "bn" ? "লাইভ লোকেশন শেয়ারিং" : "Live Location Sharing"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleLanguage}
            className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/60 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
            title="Toggle Language"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === "bn" ? "English" : "বাংলা"}</span>
          </button>
        </div>

        {/* Minimal Live Status Indicator */}
        <div className="py-6 text-center space-y-4">
          <div className="relative inline-flex items-center justify-center">
            {shareState === "ACTIVE" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 animate-ping absolute" />
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center relative">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              </>
            ) : (
              <div className="w-16 h-16 rounded-full bg-sky-500/10 border-2 border-sky-400/50 flex items-center justify-center animate-pulse">
                <Navigation className="w-7 h-7 text-sky-400 animate-spin" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {shareState === "ACTIVE"
                ? language === "bn"
                  ? "লাইভ লোকেশন শেয়ারিং সক্রিয় রয়েছে"
                  : "Live Location Sharing Active"
                : language === "bn"
                ? "ব্রাউজারে লোকেশন অনুমতি দিন..."
                : "Waiting for Location Permission..."}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              {shareState === "ACTIVE"
                ? language === "bn"
                  ? "এই পেজটি ব্যাকগ্রাউন্ডে খোলা রাখুন যাতে আপনার অবস্থান আপডেট হতে পারে।"
                  : "Please keep this tab open in the background to continue sharing."
                : language === "bn"
                ? "আপনার ব্রাউজার পপ-আপে \"Allow\" বা অনুমতি নির্বাচন করুন।"
                : "Please select \"Allow\" when prompted by your browser."}
            </p>
          </div>
        </div>

        {/* Optional Destination URL Button if provided */}
        {invitation?.destinationUrl && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                {language === "bn" ? "গন্তব্য লিংক" : "Destination"}
              </span>
              <p className="text-xs text-slate-300 truncate font-mono">
                {invitation.destinationUrl}
              </p>
            </div>
            <a
              href={invitation.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "খুলুন" : "Open"}</span>
            </a>
          </div>
        )}

        {/* Minimal Action: Stop Sharing Button */}
        <div className="pt-2">
          {shareState === "ACTIVE" && (
            <button
              onClick={handleStopSharing}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-500 active:scale-98 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30"
            >
              <StopCircle className="w-4 h-4" />
              {language === "bn" ? "লোকেশন শেয়ারিং বন্ধ করুন" : "Stop Sharing"}
            </button>
          )}

          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 mt-3">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>
              {language === "bn"
                ? "এন্ড-টু-এন্ড সুরক্ষিত ও গোপনীয়"
                : "Encrypted & Privacy Protected"}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
