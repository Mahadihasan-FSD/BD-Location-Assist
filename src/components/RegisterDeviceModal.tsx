import React, { useState } from 'react';
import { X, QrCode, Smartphone, ShieldCheck, Key, Check } from 'lucide-react';
import { RegisteredDevice } from '../types';

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceRegistered: (device: RegisteredDevice) => void;
}

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceRegistered,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [model, setModel] = useState('Pixel 9 Pro');
  const [androidVersion, setAndroidVersion] = useState('Android 15 (API 35)');
  const [pairingCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError('Please provide a nickname for this device.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/recovery/devices/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer auth_token_dhaka_owner_2026',
        },
        body: JSON.stringify({
          deviceName: deviceName.trim(),
          model,
          manufacturer: model.includes('Pixel') ? 'Google' : 'Samsung',
          androidVersion,
          pairingCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await res.json();
      onDeviceRegistered(data.device);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Enroll Android Device</h2>
              <p className="text-xs text-slate-400">Authenticated owner pairing & Keystore setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Pairing Code Banner */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              One-Time Android Pairing Code
            </span>
            <div className="text-2xl font-mono font-bold text-sky-400 tracking-widest my-1">
              {pairingCode}
            </div>
            <p className="text-[11px] text-slate-500">
              Enter this code in the Android native app or scan from the device camera.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Device Nickname:</label>
            <input
              type="text"
              placeholder="e.g. Mahadi's Secondary Phone"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Hardware Model:</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Pixel 9 Pro">Google Pixel 9 Pro</option>
                <option value="Pixel 8">Google Pixel 8</option>
                <option value="Galaxy S24 Ultra">Samsung Galaxy S24</option>
                <option value="Xiaomi 14">Xiaomi 14 Ultra</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Android OS Version:</label>
              <select
                value={androidVersion}
                onChange={(e) => setAndroidVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Android 15 (API 35)">Android 15 (API 35)</option>
                <option value="Android 14 (API 34)">Android 14 (API 34)</option>
                <option value="Android 13 (API 33)">Android 13 (API 33)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Security Verification
            </div>
            <p>
              Pairing establishes hardware-backed Keystore tokens. Telemetry is signed via HMAC-SHA256 and only the authenticated owner can trigger location updates or alarms.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
