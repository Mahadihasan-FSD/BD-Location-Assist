// Source: Google Maps Platform Code Assist
import React, { useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import {
  Navigation,
  ZoomIn,
  ZoomOut,
  Compass,
  MapPin,
  AlertCircle,
  RefreshCw,
  Radio,
  Layers,
  Info,
} from 'lucide-react';
import { LocationTelemetry, SharingSession } from '../types';
import { useTranslation } from '../i18n';

interface FindHubMapProps {
  session: SharingSession | null;
  telemetry: LocationTelemetry | null;
  isLoading?: boolean;
}

// Bangladesh Default Center (Geographical center)
const BD_CENTER = { lat: 23.6850, lng: 90.3563 };
const DEFAULT_ZOOM = 7;

// Helper: Declarative Google Maps Accuracy Circle
const GoogleMapsAccuracyCircle: React.FC<{
  center: google.maps.LatLngLiteral;
  radius: number;
  color: string;
}> = ({ center, radius, color }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({
      map,
      center,
      radius,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 1.5,
      fillColor: color,
      fillOpacity: 0.15,
      clickable: false,
    });
    circleRef.current = circle;

    return () => {
      circle.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radius);
      circleRef.current.setOptions({
        strokeColor: color,
        fillColor: color,
      });
    }
  }, [center, radius, color]);

  return null;
};

// Helper: Google Maps Camera & Interaction Controller
const GoogleMapsController: React.FC<{
  telemetry: LocationTelemetry | null;
  session: SharingSession | null;
  autoFollow: boolean;
  setAutoFollow: (val: boolean) => void;
  triggerCenter: number;
  triggerResetBD: number;
  triggerZoomIn: number;
  triggerZoomOut: number;
}> = ({
  telemetry,
  session,
  autoFollow,
  setAutoFollow,
  triggerCenter,
  triggerResetBD,
  triggerZoomIn,
  triggerZoomOut,
}) => {
  const map = useMap();
  const centeredSessionIdRef = useRef<string | null>(null);

  // Disable auto-follow when user manually drags the map
  useEffect(() => {
    if (!map) return;
    const dragListener = map.addListener('dragstart', () => {
      setAutoFollow(false);
    });
    return () => {
      google.maps.event.removeListener(dragListener);
    };
  }, [map, setAutoFollow]);

  // Handle first fix auto-center or auto-follow smoothly
  useEffect(() => {
    if (!map) return;
    const hasCoords =
      telemetry &&
      telemetry.hasLocation &&
      typeof telemetry.latitude === 'number' &&
      typeof telemetry.longitude === 'number';

    if (hasCoords) {
      const pos = { lat: telemetry.latitude!, lng: telemetry.longitude! };

      if (centeredSessionIdRef.current !== session?.id) {
        // Initial fix for this session: center and zoom in without resetting afterwards
        map.setCenter(pos);
        map.setZoom(16);
        centeredSessionIdRef.current = session?.id || null;
      } else if (autoFollow) {
        // Smoothly pan while preserving the user's selected zoom level
        map.panTo(pos);
      }
    }
  }, [map, telemetry, autoFollow, session?.id]);

  // Recenter trigger
  useEffect(() => {
    if (!map || triggerCenter === 0) return;
    if (telemetry?.hasLocation && telemetry.latitude && telemetry.longitude) {
      map.panTo({ lat: telemetry.latitude, lng: telemetry.longitude });
      if (map.getZoom()! < 15) {
        map.setZoom(16);
      }
    } else {
      map.panTo(BD_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [triggerCenter]);

  // Reset to Bangladesh Overview
  useEffect(() => {
    if (!map || triggerResetBD === 0) return;
    map.panTo(BD_CENTER);
    map.setZoom(DEFAULT_ZOOM);
  }, [triggerResetBD]);

  // Zoom In
  useEffect(() => {
    if (!map || triggerZoomIn === 0) return;
    const current = map.getZoom() || DEFAULT_ZOOM;
    map.setZoom(current + 1);
  }, [triggerZoomIn]);

  // Zoom Out
  useEffect(() => {
    if (!map || triggerZoomOut === 0) return;
    const current = map.getZoom() || DEFAULT_ZOOM;
    map.setZoom(current - 1);
  }, [triggerZoomOut]);

  return null;
};

// ==========================================
// Main FindHubMap Component
// ==========================================
export const FindHubMap: React.FC<FindHubMapProps> = ({ session, telemetry, isLoading }) => {
  const { t } = useTranslation();
  const [autoFollow, setAutoFollow] = useState(false);
  const [triggerCenter, setTriggerCenter] = useState(0);
  const [triggerResetBD, setTriggerResetBD] = useState(0);
  const [triggerZoomIn, setTriggerZoomIn] = useState(0);
  const [triggerZoomOut, setTriggerZoomOut] = useState(0);
  const [googleMapsError, setGoogleMapsError] = useState(false);

  // Check for Google Maps browser key
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  const shouldUseGoogleMaps = Boolean(googleMapsApiKey && !googleMapsError);

  // Leaflet fallback refs
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkerRef = useRef<L.Marker | null>(null);
  const leafletCircleRef = useRef<L.Circle | null>(null);
  const leafletCenteredSessionRef = useRef<string | null>(null);

  // Reset auto-center reference when selected session changes
  useEffect(() => {
    leafletCenteredSessionRef.current = null;
    setAutoFollow(false);
  }, [session?.id]);

  // Initialize Leaflet Fallback if Google Maps is disabled/unavailable
  useEffect(() => {
    if (shouldUseGoogleMaps) return;
    if (!leafletContainerRef.current) return;
    if (leafletMapRef.current) return;

    const map = L.map(leafletContainerRef.current, {
      center: [BD_CENTER.lat, BD_CENTER.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    }).addTo(map);

    leafletMapRef.current = map;

    map.on('dragstart', () => setAutoFollow(false));
    map.on('zoomstart', () => setAutoFollow(false));

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [shouldUseGoogleMaps]);

  // Handle Leaflet Telemetry Updates
  useEffect(() => {
    if (shouldUseGoogleMaps) return;
    const map = leafletMapRef.current;
    if (!map) return;

    const hasCoords =
      telemetry &&
      telemetry.hasLocation &&
      typeof telemetry.latitude === 'number' &&
      typeof telemetry.longitude === 'number';

    if (hasCoords) {
      const lat = telemetry.latitude!;
      const lng = telemetry.longitude!;
      const accuracy = telemetry.accuracyMeters || 15;
      const isLive = telemetry.isLive ?? true;

      const customIcon = L.divIcon({
        className: 'custom-live-marker',
        html: `
          <div class="marker-pin-outer">
            <div class="marker-pin-inner" style="background: ${isLive ? '#0284c7' : '#f59e0b'};"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([lat, lng]);
        leafletMarkerRef.current.setIcon(customIcon);
      } else {
        leafletMarkerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      }

      if (leafletCircleRef.current) {
        leafletCircleRef.current.setLatLng([lat, lng]);
        leafletCircleRef.current.setRadius(accuracy);
        leafletCircleRef.current.setStyle({
          color: isLive ? '#0284c7' : '#f59e0b',
          fillColor: isLive ? '#38bdf8' : '#fcd34d',
          fillOpacity: 0.15,
        });
      } else {
        leafletCircleRef.current = L.circle([lat, lng], {
          radius: accuracy,
          color: isLive ? '#0284c7' : '#f59e0b',
          fillColor: isLive ? '#38bdf8' : '#fcd34d',
          fillOpacity: 0.15,
          weight: 1.5,
        }).addTo(map);
      }

      if (leafletCenteredSessionRef.current !== session?.id) {
        map.setView([lat, lng], 16, { animate: true });
        leafletCenteredSessionRef.current = session?.id || null;
      } else if (autoFollow) {
        map.panTo([lat, lng], { animate: true });
      }
    } else {
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.remove();
        leafletMarkerRef.current = null;
      }
      if (leafletCircleRef.current) {
        leafletCircleRef.current.remove();
        leafletCircleRef.current = null;
      }
    }
  }, [shouldUseGoogleMaps, telemetry, autoFollow, session?.id]);

  const hasLocation = Boolean(
    telemetry && telemetry.hasLocation && telemetry.latitude && telemetry.longitude
  );

  const coords = hasLocation
    ? { lat: telemetry!.latitude!, lng: telemetry!.longitude! }
    : null;

  const handleCenter = () => {
    if (shouldUseGoogleMaps) {
      setTriggerCenter((c) => c + 1);
    } else if (leafletMapRef.current) {
      if (hasLocation && coords) {
        leafletMapRef.current.setView([coords.lat, coords.lng], Math.max(leafletMapRef.current.getZoom(), 16), { animate: true });
      } else {
        leafletMapRef.current.setView([BD_CENTER.lat, BD_CENTER.lng], DEFAULT_ZOOM, { animate: true });
      }
    }
  };

  const handleResetBD = () => {
    setAutoFollow(false);
    if (shouldUseGoogleMaps) {
      setTriggerResetBD((c) => c + 1);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.setView([BD_CENTER.lat, BD_CENTER.lng], DEFAULT_ZOOM, { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (shouldUseGoogleMaps) {
      setTriggerZoomIn((c) => c + 1);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (shouldUseGoogleMaps) {
      setTriggerZoomOut((c) => c + 1);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const markerColor = telemetry?.isLive ? '#0284c7' : '#f59e0b';

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden flex flex-col select-none">
      {/* Map Rendering Container */}
      {shouldUseGoogleMaps ? (
        <APIProvider
          apiKey={googleMapsApiKey!}
          onError={(e) => {
            console.error('Google Maps Load Error, falling back to Leaflet:', e);
            setGoogleMapsError(true);
          }}
        >
          <div className="w-full h-full">
            <Map
              id="bd-main-map"
              defaultCenter={BD_CENTER}
              defaultZoom={DEFAULT_ZOOM}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              disableDefaultUI={true}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
            >
              {/* Controller for pan/zoom/auto-follow */}
              <GoogleMapsController
                telemetry={telemetry}
                session={session}
                autoFollow={autoFollow}
                setAutoFollow={setAutoFollow}
                triggerCenter={triggerCenter}
                triggerResetBD={triggerResetBD}
                triggerZoomIn={triggerZoomIn}
                triggerZoomOut={triggerZoomOut}
              />

              {/* Real GPS Marker using AdvancedMarkerElement */}
              {hasLocation && coords && (
                <>
                  <AdvancedMarker position={coords} title={session?.purpose || 'Live Location'}>
                    <div className="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
                      <span
                        className="absolute w-8 h-8 rounded-full animate-ping opacity-40"
                        style={{ backgroundColor: markerColor }}
                      />
                      <div
                        className="w-8 h-8 rounded-full bg-white shadow-lg border-2 flex items-center justify-center transition-transform hover:scale-110"
                        style={{ borderColor: markerColor }}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: markerColor }}
                        />
                      </div>
                    </div>
                  </AdvancedMarker>

                  {/* Real Accuracy Circle in meters */}
                  <GoogleMapsAccuracyCircle
                    center={coords}
                    radius={telemetry?.accuracyMeters || 20}
                    color={markerColor}
                  />
                </>
              )}
            </Map>
          </div>
        </APIProvider>
      ) : (
        <div ref={leafletContainerRef} className="w-full h-full" />
      )}

      {/* Map Provider Badge */}
      <div className="absolute left-4 bottom-24 lg:bottom-4 z-[20] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-2 text-[10px] text-slate-600 font-medium pointer-events-auto">
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>{shouldUseGoogleMaps ? t.mapProviderGoogle : t.mapProviderLeaflet}</span>
          {!shouldUseGoogleMaps && (
            <span
              title={t.googleMapsKeyMissingNotice}
              className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[9px] cursor-help"
            >
              i
            </span>
          )}
        </div>
      </div>

      {/* Floating Map Controls (Find Hub Inspired, Touch-friendly >= 44px) */}
      <div className="absolute right-4 bottom-20 lg:bottom-8 z-[20] flex flex-col gap-2 shadow-lg">
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 overflow-hidden shadow-md">
          <button
            onClick={handleZoomIn}
            title={t.zoomIn}
            aria-label={t.zoomIn}
            className="w-11 h-11 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors border-b border-slate-100"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            title={t.zoomOut}
            aria-label={t.zoomOut}
            className="w-11 h-11 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>

        {/* Recenter on Real Location */}
        <button
          onClick={handleCenter}
          title={hasLocation ? t.recenterTitle : t.bangladeshOverview}
          aria-label={hasLocation ? t.recenterTitle : t.bangladeshOverview}
          className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors shadow-md flex items-center justify-center"
        >
          <Navigation className={`w-5 h-5 ${hasLocation ? 'text-sky-600' : 'text-slate-400'}`} />
        </button>

        {/* Auto-Follow Toggle */}
        <button
          onClick={() => {
            const next = !autoFollow;
            setAutoFollow(next);
            if (next && hasLocation && coords) {
              handleCenter();
            }
          }}
          title={autoFollow ? t.autoFollowOn : t.autoFollowOff}
          aria-label={autoFollow ? t.autoFollowOn : t.autoFollowOff}
          className={`w-11 h-11 backdrop-blur-md rounded-2xl border transition-colors shadow-md flex items-center justify-center ${
            autoFollow
              ? 'bg-sky-600 text-white border-sky-700 shadow-sky-600/30'
              : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Radio className={`w-5 h-5 ${autoFollow ? 'animate-pulse text-white' : 'text-slate-500'}`} />
        </button>

        {/* Reset to Bangladesh Overview */}
        <button
          onClick={handleResetBD}
          title={t.bangladeshOverview}
          aria-label={t.bangladeshOverview}
          className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors shadow-md flex items-center justify-center"
        >
          <Compass className="w-5 h-5 text-emerald-600" />
        </button>
      </div>

      {/* Floating Status & Telemetry HUD on Top of Map */}
      <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-[20] pointer-events-none">
        {session ? (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-lg pointer-events-auto max-w-sm text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="truncate">{session.purpose}</span>
              </span>

              {hasLocation ? (
                telemetry?.isLive ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t.liveHUD}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] shrink-0">
                    {t.staleHUD}
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] shrink-0 font-medium">
                  {t.waitingHUD}
                </span>
              )}
            </div>

            {hasLocation ? (
              <div className="text-[11px] text-slate-600 space-y-1.5 border-t border-slate-100 pt-2 font-mono">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">{t.coordinates}</span>
                  <span className="text-slate-800 font-medium">
                    {telemetry!.latitude!.toFixed(5)}° N, {telemetry!.longitude!.toFixed(5)}° E
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">{t.accuracy}</span>
                  <span
                    className={`font-semibold ${
                      telemetry!.accuracyMeters! < 30
                        ? 'text-emerald-700'
                        : telemetry!.accuracyMeters! <= 100
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    ±{Math.round(telemetry!.accuracyMeters!)} m
                    <span className="font-sans font-normal ml-1">
                      {telemetry!.accuracyMeters! < 30
                        ? t.highAccuracy
                        : telemetry!.accuracyMeters! <= 100
                        ? t.medAccuracy
                        : t.lowAccuracy}
                    </span>
                  </span>
                </div>

                {telemetry!.accuracyMeters! > 100 && (
                  <div className="text-[10px] font-sans text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 leading-tight">
                    {t.poorAccuracyWarning}
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[10px] font-sans">
                  <span>{t.lastUpdated}</span>
                  <span>
                    {telemetry!.diffSeconds !== undefined && telemetry!.diffSeconds < 60
                      ? `${telemetry!.diffSeconds} ${t.secAgo}`
                      : `${Math.floor((telemetry!.diffSeconds || 0) / 60)} ${t.minAgo}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{t.noRecipientConsentHud}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-600 shadow-md pointer-events-auto">
            {t.selectSessionToView}
          </div>
        )}
      </div>

      {/* No Location Waiting Banner (Real-only data guarantee) */}
      {session && !hasLocation && (
        <div className="absolute inset-x-4 bottom-24 lg:bottom-8 lg:left-8 lg:right-auto z-[20] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-sky-200 rounded-2xl p-4 shadow-xl max-w-md pointer-events-auto flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="text-xs">
              <h4 className="font-semibold text-slate-900">{t.waitingForSignalTitle}</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">{t.waitingForSignalDesc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
