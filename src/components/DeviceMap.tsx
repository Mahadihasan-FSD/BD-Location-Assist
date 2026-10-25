import React, { useState } from 'react';
import { MapPin, Navigation, AlertTriangle, Radio, Compass, Layers } from 'lucide-react';
import { RegisteredDevice } from '../types';

interface DeviceMapProps {
  device: RegisteredDevice | null;
  onRefreshLocate?: () => void;
  isRefreshing?: boolean;
}

export const DeviceMap: React.FC<DeviceMapProps> = ({ device, onRefreshLocate, isRefreshing }) => {
  const [zoomLevel, setZoomLevel] = useState(15);
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');

  if (!device) {
    return (
      <div className="h-full min-h-[420px] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 p-6">
        <MapPin className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <p className="text-base font-medium">Select a device to view location telemetry</p>
        <p className="text-xs text-slate-500 mt-1">Telemetry will be displayed with real-time status and accuracy radius</p>
      </div>
    );
  }

  const {
    lastLatitude,
    lastLongitude,
    lastAccuracyMeters,
    lastLocationTimestamp,
    isOnline,
    isStale,
    diffMinutes = 0,
    deviceName,
    lastAddress,
  } = device;

  // Format timestamp nicely
  const locationDate = new Date(lastLocationTimestamp);
  const formattedTime = locationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = locationDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  // Compute OpenStreetMap static tile parameters or interactive embed
  // We use OpenStreetMap tile coordinates to provide a rich interactive map preview
  // Also provide direct link to OpenStreetMap / Google Maps for real navigation
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lastLongitude - 0.008}%2C${lastLatitude - 0.006}%2C${lastLongitude + 0.008}%2C${lastLatitude + 0.006}&layer=mapnik&marker=${lastLatitude}%2C${lastLongitude}`;
  const externalNavUrl = `https://www.google.com/maps/search/?api=1&query=${lastLatitude},${lastLongitude}`;

  return (
    <div className="relative h-full min-h-[460px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
      {/* Top Map Status Banner */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {isOnline ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3" />
              LIVE TELEMETRY
            </div>
          ) : isStale ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              STALE DATA ({diffMinutes > 60 ? `${Math.floor(diffMinutes / 60)}h ago` : `${diffMinutes}m ago`})
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              DEVICE OFFLINE
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            Accuracy: ±{Math.round(lastAccuracyMeters)}m
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {onRefreshLocate && (
            <button
              onClick={onRefreshLocate}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-lg active:scale-95"
            >
              <Navigation className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Pinging GPS...' : 'Locate Now'}
            </button>
          )}

          <a
            href={externalNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all border border-slate-700 shadow-lg"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            Open Maps
          </a>
        </div>
      </div>

      {/* Warning Alert Banner for Stale/Offline Device (Honesty in Recovery Requirement) */}
      {(!isOnline || isStale) && (
        <div className="absolute top-16 left-3 right-3 z-20 pointer-events-none">
          <div className="bg-amber-950/80 border border-amber-500/40 rounded-xl p-3 backdrop-blur-md text-amber-200 text-xs shadow-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">
                Notice: Displaying Last Known Cached Location
              </p>
              <p className="text-amber-200/90 mt-0.5">
                The device is currently not transmitting live telemetry (it may be powered off, out of network coverage, or in deep battery sleep).
                This coordinate was recorded on <strong>{formattedDate} at {formattedTime}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map Frame */}
      <div className="flex-1 relative w-full h-full min-h-[380px] bg-slate-950">
        <iframe
          title={`Location map of ${deviceName}`}
          src={osmUrl}
          className="w-full h-full border-0 filter contrast-105 brightness-95"
          loading="lazy"
        />

        {/* Accuracy and Pin Overlay HUD */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Accuracy radius visualization */}
          <div
            className={`rounded-full border-2 transition-all duration-700 ${
              isOnline
                ? 'border-sky-400/50 bg-sky-500/10 animate-pulse'
                : 'border-amber-400/40 bg-amber-500/5'
            }`}
            style={{
              width: `${Math.min(220, Math.max(70, lastAccuracyMeters * 3))}px`,
              height: `${Math.min(220, Math.max(70, lastAccuracyMeters * 3))}px`,
            }}
          />

          {/* Central Device Target Pin */}
          <div className="absolute flex flex-col items-center -translate-y-4">
            <div className={`p-2 rounded-full shadow-2xl transition-all ${
              isOnline ? 'bg-sky-500 text-white ring-4 ring-sky-500/30' : 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/30'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div className="mt-1 px-2 py-0.5 rounded bg-slate-900/90 text-[10px] font-mono text-slate-200 border border-slate-700 backdrop-blur-sm whitespace-nowrap shadow-lg">
              {deviceName}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Detail Bar */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-3.5 z-20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Position:</span>
            <span className="font-mono text-slate-200 font-medium">
              {lastLatitude.toFixed(6)}° N, {lastLongitude.toFixed(6)}° E
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Accuracy:</span>
            <span className="font-mono text-emerald-400 font-medium">±{lastAccuracyMeters}m</span>
          </div>
          <div className="text-slate-300 font-medium truncate max-w-lg">
            📍 {lastAddress || 'Dhaka Metropolitan Area, Bangladesh'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-slate-400 text-[11px]">Hardware GPS Timestamp:</div>
          <div className="font-mono text-slate-200 font-medium">
            {formattedDate} {formattedTime} UTC
          </div>
        </div>
      </div>
    </div>
  );
};
