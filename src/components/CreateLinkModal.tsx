import React, { useState } from 'react';
import { X, Clock, Copy, Check, Share2, AlertCircle, Compass, Sparkles } from 'lucide-react';
import { SharingSession } from '../types';
import { useTranslation } from '../i18n';
import { getAuthToken } from '../lib/supabase';

import { createSharingSession } from '../services/sessionService';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: SharingSession, url: string) => void;
}

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const { t, language } = useTranslation();
  const [purpose, setPurpose] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0); // 0 = until stopped (recommended)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const DURATION_OPTIONS = [
    { label: t.durationOptionForever, value: 0 },
    { label: t.durationOption1h, value: 60 },
    { label: t.durationOption2h, value: 120 },
    { label: t.durationOption8h, value: 480 },
    { label: t.durationOption24h, value: 1440 },
  ];

  const PURPOSE_PRESETS = language === 'bn' ? [
    'জরুরি চিকিৎসা বা অ্যাম্বুলেন্স সহায়তা',
    'রাস্তা বা ভ্রমণের লাইভ ট্র্যাকিং',
    'ব্যক্তিগত সাক্ষাত বা অবস্থান যাচাই',
    'পার্সেল বা ডেলিভারি পৌঁছানো',
  ] : [
    'Emergency assistance / medical',
    'Live commute / trip tracking',
    'Meetup & location verification',
    'Delivery / parcel coordination',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Purpose is optional! If user leaves it blank, it defaults to a standard label.
    if (
      destinationUrl.trim() &&
      !destinationUrl.trim().startsWith('http://') &&
      !destinationUrl.trim().startsWith('https://')
    ) {
      setError(
        language === 'bn'
          ? 'গন্তব্য লিংকটি অবশ্যই http:// অথবা https:// দিয়ে শুরু হতে হবে।'
          : 'Destination URL must start with http:// or https://'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createSharingSession({
        purpose: purpose.trim() || (language === 'bn' ? 'লোকেশন শেয়ারিং' : 'Location Sharing'),
        durationMinutes: durationMinutes === 0 ? null : durationMinutes,
        destinationUrl: destinationUrl.trim() || undefined,
      });

      setCreatedUrl(result.invitationUrl);
      onSessionCreated(result.session, result.invitationUrl);
    } catch (err: any) {
      setError(
        err?.message ||
          (language === 'bn'
            ? 'সেশন তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
            : 'Failed to create session. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdUrl) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(createdUrl);
        setCopied(true);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = createdUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const handleResetAndClose = () => {
    setPurpose('');
    setDestinationUrl('');
    setCreatedUrl(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.modalCreateTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {t.modalCreateSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {!createdUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Optional Purpose Input & Quick Presets */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  {t.purposeLabel}
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t.purposePlaceholder}
                  className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs text-slate-800 transition-all placeholder:text-slate-400"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PURPOSE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPurpose(preset)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 text-[11px] text-slate-600 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart Destination URL (Optional) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <label className="block text-emerald-950 font-semibold mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  {t.destinationInputLabel}
                </label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder={t.destinationPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs text-slate-800 transition-all placeholder:text-slate-400"
                />
                <p className="text-[10px] text-emerald-700 mt-1.5">
                  {t.destinationHelper}
                </p>
              </div>

              {/* Session Duration Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {t.durationSelectLabel}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDurationMinutes(opt.value)}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between ${
                        durationMinutes === opt.value
                          ? 'border-sky-600 bg-sky-50 text-sky-900 font-semibold ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {durationMinutes === opt.value && (
                        <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-bold text-xs shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Share2 className="w-4 h-4 animate-spin" />
                      {t.generatingBtn}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t.generateBtn}
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Created URL Success View */
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-950">
                    {t.modalSuccessTitle}
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    {t.modalSuccessSubtitle}
                  </p>
                </div>
              </div>

              {/* URL Display Box */}
              <div>
                <label className="block text-slate-500 text-[11px] font-semibold mb-1">
                  {t.copyInvitationLink}:
                </label>
                <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-200 bg-slate-50">
                  <input
                    type="text"
                    readOnly
                    value={createdUrl}
                    className="w-full bg-transparent text-xs text-slate-800 font-mono px-2 outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {t.copied}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        {t.copyLink}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Complete Action */}
              <div className="pt-2">
                <button
                  onClick={handleResetAndClose}
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                >
                  {t.doneBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
