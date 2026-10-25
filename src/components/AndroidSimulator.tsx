import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Signal,
  Bell,
  Shield,
  Volume2,
  VolumeX,
  RefreshCw,
  Power,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
} from 'lucide-react';
import { RegisteredDevice } from '../types';

interface AndroidSimulatorProps {
  device: RegisteredDevice | null;
  onTelemetryUpdated: () => void;
  isRinging: boolean;
  onStopRing: () => void;
}

// Preset locations in Dhaka, Bangladesh for testing
const DHAKA_PRESETS = [
  { name: 'Dhanmondi 27', lat: 23.7465, lng: 90.3768, address: 'Road 27, Dhanmondi, Dhaka 1209' },
  { name: 'Gulshan 2 Circle', lat: 23.7925, lng: 90.4078, address: 'Gulshan 2 Avenue, Dhaka 1212' },
  { name: 'Motijheel Commercial', lat: 23.7334, lng: 90.4175, address: 'Motijheel C/A, Dhaka 1000' },
  { name: 'Uttara Sector 3', lat: 23.8698, lng: 90.3986, address: 'Sector 3, Uttara, Dhaka 1230' },
  { name: 'Mirpur 10 Circle', lat: 23.8071, lng: 90.3686, address: 'Mirpur 10 Roundabout, Dhaka 1216' },
];

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({
  device,
  onTelemetryUpdated,
  isRinging,
  onStopRing,
}) => {
  if (!device) return null;

  const [battery, setBattery] = useState(device.batteryLevel);
  const [isCharging, setIsCharging] = useState(device.isCharging);
  const [networkType, setNetworkType] = useState<'WIFI' | 'CELLULAR' | 'NONE'>(device.networkType);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [hasFineLocation, setHasFineLocation] = useState(true);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [isServiceRunning, setIsServiceRunning] = useState(device.recoveryEnabled && device.status === 'ACTIVE');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Sync state if device props change
  useEffect(() => {
    setBattery(device.batteryLevel);
    setIsCharging(device.isCharging);
    setNetworkType(device.networkType);
    setIsServiceRunning(device.recoveryEnabled && device.status === 'ACTIVE');
  }, [device.id, device.recoveryEnabled, device.status]);

  // Audio synthesis for remote siren when triggered
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    let gain: GainNode | null = null;
    let interval: NodeJS.Timeout | null = null;

    if (isRinging) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          osc = audioCtx.createOscillator();
          gain = audioCtx.createGain();

          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);

          let high = false;
          interval = setInterval(() => {
            if (audioCtx && osc) {
              const freq = high ? 960 : 720;
              osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
              high = !high;
            }
          }, 350);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
        }
      } catch (e) {
        console.warn('AudioContext error for siren:', e);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (osc) {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      }
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch (e) {}
      }
    };
  }, [isRinging]);

  // Send telemetry from simulated Android device
  const handleSendTelemetry = async () => {
    if (networkType === 'NONE') {
      setLastSyncResult('Offline: No network connection. Telemetry queued locally in Room.');
      return;
    }

    if (!hasFineLocation) {
      setLastSyncResult('Error: Location permission denied on device.');
      return;
    }

    setIsSyncing(true);
    setLastSyncResult(null);

    const preset = DHAKA_PRESETS[selectedPresetIndex];
    // Add tiny jitter to simulate live GPS movement
    const jitterLat = preset.lat + (Math.random() - 0.5) * 0.0004;
    const jitterLng = preset.lng + (Math.random() - 0.5) * 0.0004;

    try {
      const res = await fetch('/api/recovery/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': device.id,
          'X-Device-Secret': device.deviceSecret,
        },
        body: JSON.stringify({
          latitude: jitterLat,
          longitude: jitterLng,
          accuracyMeters: Math.floor(6 + Math.random() * 8),
          altitudeMeters: 14.5,
          speed: 1.2,
          batteryLevel: battery,
          isCharging,
          networkType,
          recordedAt: new Date().toISOString(),
          address: preset.address,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastSyncResult(`Synced successfully at ${new Date().toLocaleTimeString()}`);
        onTelemetryUpdated();

        // Check if commands were returned (e.g., RING)
        if (data.commands && data.commands.length > 0) {
          data.commands.forEach((cmd: any) => {
            if (cmd.command === 'RING') {
              // ring triggered
            }
          });
        }
      } else {
        const err = await res.json();
        setLastSyncResult(`Sync failed: ${err.error || res.statusText}`);
      }
    } catch (e: any) {
      setLastSyncResult(`Connection failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl flex flex-col">
      {/* Device Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Android Device Agent
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-400 border border-slate-700">
                {device.androidVersion}
              </span>
            </h3>
            <p className="text-xs text-slate-400">{device.deviceName} ({device.model})</p>
          </div>
        </div>

        {/* Siren Alert Status Indicator */}
        {isRinging && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-bounce">
            <Volume2 className="w-4 h-4 animate-spin" />
            SIREN RINGING!
            <button
              onClick={onStopRing}
              className="ml-2 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px]"
            >
              Silence
            </button>
          </div>
        )}
      </div>

      {/* Simulated Device Screen Mockup */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 mb-4 text-xs space-y-3">
        {/* Android Status Bar */}
        <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isServiceRunning && <span className="text-sky-400 font-bold">● REC</span>}
          </div>
          <div className="flex items-center gap-2">
            {networkType === 'WIFI' && <Wifi className="w-3.5 h-3.5 text-sky-400" />}
            {networkType === 'CELLULAR' && <Signal className="w-3.5 h-3.5 text-emerald-400" />}
            {networkType === 'NONE' && <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span className="flex items-center gap-1">
              {isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Battery className={`w-3.5 h-3.5 ${battery < 20 ? 'text-rose-400' : 'text-slate-300'}`} />
              )}
              {battery}%
            </span>
          </div>
        </div>

        {/* Android 14+ Mandatory Foreground Notification Preview */}
        {isServiceRunning && hasNotifications ? (
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-2.5 shadow">
            <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs">BD Location Assist</span>
                <span className="text-[10px] text-slate-500 font-mono">Ongoing</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Device Recovery Active • Tap to view or pause protection.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setIsServiceRunning(false)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-amber-300 border border-slate-700"
                >
                  Pause Recovery
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/30 text-amber-300 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Foreground service paused. Location reporting halted on device.
          </div>
        )}
      </div>

      {/* Hardware & Network Controls */}
      <div className="space-y-3 flex-1">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Simulate Android Sensor Feeds
        </div>

        {/* Bangladesh Landmark / GPS Coordinates Preset */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Simulated GPS Fix (Dhaka):</label>
          <select
            value={selectedPresetIndex}
            onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {DHAKA_PRESETS.map((p, idx) => (
              <option key={idx} value={idx}>
                {p.name} ({p.lat.toFixed(4)}, {p.lng.toFixed(4)})
              </option>
            ))}
          </select>
        </div>

        {/* Network & Battery Controls */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Network Connectivity:</label>
            <select
              value={networkType}
              onChange={(e) => setNetworkType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="WIFI">Wi-Fi (Fast Sync)</option>
              <option value="CELLULAR">4G/5G Cellular</option>
              <option value="NONE">Airplane Mode / Offline</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Battery Level: {battery}%</label>
            <input
              type="range"
              min="1"
              max="100"
              value={battery}
              onChange={(e) => setBattery(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
          </div>
        </div>

        {/* Android Permissions Toggles */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-2 text-xs">
          <div className="text-[11px] font-semibold text-slate-400">Android System Permissions:</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">ACCESS_FINE_LOCATION:</span>
            <button
              onClick={() => setHasFineLocation(!hasFineLocation)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                hasFineLocation ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {hasFineLocation ? 'GRANTED' : 'DENIED'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">POST_NOTIFICATIONS (API 33+):</span>
            <button
              onClick={() => setHasNotifications(!hasNotifications)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                hasNotifications ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {hasNotifications ? 'GRANTED' : 'DENIED'}
            </button>
          </div>
        </div>

        {/* Manual Telemetry Sync Button */}
        <button
          onClick={handleSendTelemetry}
          disabled={isSyncing}
          className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Uploading Telemetry (X-Device-Id + HMAC)...' : 'Transmit Live Telemetry Ping'}
        </button>

        {lastSyncResult && (
          <div className={`p-2 rounded text-[11px] font-mono border ${
            lastSyncResult.startsWith('Synced') ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/40' : 'bg-amber-950/40 text-amber-300 border-amber-700/40'
          }`}>
            {lastSyncResult}
          </div>
        )}
      </div>
    </div>
  );
};
