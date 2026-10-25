import React, { useState, useEffect } from 'react';
import { Share2, Clock, Battery, Copy, Check, ExternalLink, ShieldAlert, UserCheck } from 'lucide-react';
import { ShareSession } from '../types';

export const WebShareTab: React.FC = () => {
  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/share/sessions')
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions || []))
      .catch((err) => console.error('Failed to fetch web share sessions', err));
  }, []);

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Isolation Banner */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3.5 shadow-xl">
        <UserCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-200">
          <p className="font-semibold text-indigo-300 text-sm">
            Phase 1: Web Link-Based Consent Sharing (Decoupled Feature)
          </p>
          <p className="mt-1 leading-relaxed text-indigo-200/90">
            This module generates temporary, time-limited, view-only web URLs for live commute sharing with family or emergency contacts.
            It does <strong>not</strong> require native Android app installation and operates completely independently from the Phase 2 Native Android Lost-Phone Recovery system.
          </p>
        </div>
      </div>

      {/* Active Shares List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">{session.creatorName}</h4>
                <p className="text-xs text-slate-400">Destination: {session.destination}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ACTIVE SHARE
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinates:</span>
                <span>{session.latitude.toFixed(4)}° N, {session.longitude.toFixed(4)}° E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Battery Level:</span>
                <span className="text-emerald-400">{session.battery}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-Expires:</span>
                <span className="text-amber-400">
                  {new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopyLink(session.id)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                {copiedId === session.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy Viewer Link
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
