import React, { useState } from 'react';
import {
  Shield,
  MapPin,
  CheckCircle,
  Radio,
  Lock,
  ArrowRight,
  Compass,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Smartphone,
  EyeOff,
  UserCheck,
  Languages,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../i18n';

interface LandingPageProps {
  currentUser: UserProfile | null;
  onOpenAuth: (tab: 'signin' | 'signup') => void;
  onNavigateToDashboard: () => void;
  onLogout: () => void;
  registrationSuccessNotice?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onOpenAuth,
  onNavigateToDashboard,
  onLogout,
  registrationSuccessNotice,
}) => {
  const { language, toggleLanguage } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeLandmark, setActiveLandmark] = useState<'dhaka' | 'chittagong' | 'sylhet'>('dhaka');

  const LANDMARK_DATA = {
    dhaka: {
      city: language === 'bn' ? 'ঢাকা (গুলশান-২)' : 'Dhaka (Gulshan-2)',
      lat: '23.7925° N',
      lng: '90.4078° E',
      acc: '±3.8m',
      status: language === 'bn' ? 'সক্রিয় সম্মতি' : 'Active Consent',
      speed: '18 km/h',
    },
    chittagong: {
      city: language === 'bn' ? 'চট্টগ্রাম (আগ্রাবাদ)' : 'Chittagong (Agrabad)',
      lat: '22.3255° N',
      lng: '91.8142° E',
      acc: '±4.5m',
      status: language === 'bn' ? 'সক্রিয় সম্মতি' : 'Active Consent',
      speed: '0 km/h (Stationary)',
    },
    sylhet: {
      city: language === 'bn' ? 'সিলেট (জিন্দাবাজার)' : 'Sylhet (Zindabazar)',
      lat: '24.8949° N',
      lng: '91.8687° E',
      acc: '±4.1m',
      status: language === 'bn' ? 'সক্রিয় সম্মতি' : 'Active Consent',
      speed: '24 km/h',
    },
  };

  const handleGetStartedClick = () => {
    if (currentUser) {
      onNavigateToDashboard();
    } else {
      onOpenAuth('signup');
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const FAQS = language === 'bn' ? [
    {
      q: 'কোন ব্যক্তির অনুমতি ছাড়া গোপনে লোকেশন ট্র্যাক করা সম্ভব কি?',
      a: 'না, কোনোভাবেই সম্ভব নয়। আমাদের পুরো আর্কিটেকচার কঠোর সম্মতিভিত্তিক (Consent-First)। প্রেরক যখন লিংক পাঠান, প্রাপক তার নিজস্ব ফোনে লিংকটি খুলে নিজ ইচ্ছায় "সম্মতি প্রদান" ও ব্রাউজারের GPS অনুমতি দিলেই কেবল লাইভ অবস্থান দৃশ্যমান হয়।',
    },
    {
      q: 'প্রাপক কীভাবে অবস্থান শেয়ারিং যেকোনো মুহূর্তে বন্ধ করতে পারেন?',
      a: 'প্রাপকের স্ক্রিনে একটি সার্বক্ষণিক স্পষ্ট "শেয়ারিং বন্ধ করুন" (Stop Sharing) বোতাম থাকে। প্রাপক বোতামে চাপ দিলে তৎক্ষণাৎ জিপিএস সংকেত বন্ধ হয়ে যায় এবং অ্যাক্সেস বাতিল হয়।',
    },
    {
      q: 'শেয়ারিং সময়সীমা শেষ হলে কী ঘটে?',
      a: 'সেশন তৈরি করার সময় নির্ধারিত সময়সীমা (যেমন ১ ঘণ্টা, ২ ঘণ্টা বা সর্বোচ্চ ২৪ ঘণ্টা) শেষ হলে স্বয়ংক্রিয়ভাবে সেশনটির মেয়াদ উত্তীর্ণ হয়ে যায় এবং কোনো ডেটা আর আদান-প্রদান হয় না।',
    },
    {
      q: 'ব্যবহারকারীদের কি কোনো মোবাইল অ্যাপ ইনস্টল করতে হয়?',
      a: 'কোনো অ্যাপ ডাউনলোডের প্রয়োজন নেই। এটি যেকোনো আধুনিক মোবাইল বা ডেস্কটপ ওয়েব ব্রাউজারে (Chrome, Safari, Firefox, Edge) নিরাপদে ও দ্রুত কাজ করে।',
    },
    {
      q: 'আমন্ত্রণের লিংক ও লোকেশন ডেটা কীভাবে সুরক্ষিত থাকে?',
      a: 'সব ইনভিটেশন টোকেন ডাটাবেজে ক্রিপ্টোগ্রাফিক SHA-256 হ্যাশ আকারে সংরক্ষিত থাকে। সেশন শেষ হওয়ার সাথে সাথে সাময়িক লাইভ ট্র্যাকিং সমন্বয় মুছে ফেলা হয়।',
    },
  ] : [
    {
      q: 'Can I track someone secretly without their knowledge or permission?',
      a: 'No, absolutely not. Our architecture is strictly consent-driven. The recipient must open the secure link on their device and explicitly approve both the sharing consent prompt and their browser GPS permission.',
    },
    {
      q: 'How can the recipient stop sharing at any time?',
      a: 'The recipient has a persistent, prominent "Stop Sharing" button directly on their active session screen. Tapping it terminates location transmission immediately.',
    },
    {
      q: 'What happens when the chosen duration expires?',
      a: 'Once the configured session duration ends (e.g. 1 hour, 2 hours, or custom duration), the session automatically transitions to Expired, and no further coordinates can be requested or sent.',
    },
    {
      q: 'Do recipients or requesters need to install an app?',
      a: 'No app download or installation is required. The web application runs in modern mobile and desktop browsers including Safari, Chrome, Edge, and Firefox.',
    },
    {
      q: 'How is location telemetry and invitation security handled?',
      a: 'Invitation tokens are never stored raw in the database; they are cryptographically hashed using SHA-256. Telemetry streams directly over secure HTTPS/WSS and can be revoked by either party at any time.',
    },
  ];

  const currentLandmarkData = LANDMARK_DATA[activeLandmark];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Registration Confirmation Floating Banner (if recently signed up) */}
      {registrationSuccessNotice && (
        <div className="bg-emerald-600 text-white text-xs py-2.5 px-4 text-center font-medium flex items-center justify-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{registrationSuccessNotice}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. Header (Top Navigation: 3-Zone Architecture)                */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Logo & Brand Wordmark */}
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="flex items-center gap-2.5 text-slate-900 group"
              aria-label="BD Location Assist Home"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-600 group-hover:bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-600/20 transition-all">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                  BD Location Assist
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  {language === 'bn' ? 'নিরাপদ সম্মতিভিত্তিক ট্র্যাকিং' : 'Consent-Driven Location Sharing'}
                </span>
              </div>
            </a>
          </div>

          {/* Zone 2: Navigation Links (Single-line, desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('hero')}
              className="hover:text-sky-600 transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'হোম' : 'Home'}
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-sky-600 transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'কীভাবে কাজ করে' : 'How It Works'}
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-sky-600 transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'ফিচারসমূহ' : 'Features'}
            </button>
            <button
              onClick={() => scrollToSection('privacy')}
              className="hover:text-sky-600 transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'প্রাইভেসি ও ট্রাস্ট' : 'Privacy & Trust'}
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-sky-600 transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'প্রশ্নোত্তর' : 'FAQ'}
            </button>
          </nav>

          {/* Zone 3: Actions & Auth Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              title="Toggle Language"
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Languages className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline font-mono">{language === 'bn' ? 'EN' : 'বাংলা'}</span>
            </button>

            {currentUser ? (
              /* Authenticated User Controls */
              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigateToDashboard}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'Open Dashboard'}</span>
                </button>

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Signed-Out Visitor Actions */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors hidden sm:block"
                >
                  {language === 'bn' ? 'লগইন' : 'Log In'}
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors hidden sm:block"
                >
                  {language === 'bn' ? 'অ্যাকাউন্ট তৈরি' : 'Create Account'}
                </button>
                <button
                  onClick={handleGetStartedClick}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>{language === 'bn' ? 'শুরু করুন' : 'Get Started'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button (Touch target >= 44px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-5 space-y-4 shadow-xl animate-fade-in">
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <button
                onClick={() => scrollToSection('hero')}
                className="py-2.5 px-3 rounded-lg text-left hover:bg-slate-100"
              >
                {language === 'bn' ? 'হোম' : 'Home'}
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="py-2.5 px-3 rounded-lg text-left hover:bg-slate-100"
              >
                {language === 'bn' ? 'কীভাবে কাজ করে' : 'How It Works'}
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="py-2.5 px-3 rounded-lg text-left hover:bg-slate-100"
              >
                {language === 'bn' ? 'ফিচারসমূহ' : 'Features'}
              </button>
              <button
                onClick={() => scrollToSection('privacy')}
                className="py-2.5 px-3 rounded-lg text-left hover:bg-slate-100"
              >
                {language === 'bn' ? 'প্রাইভেসি ও নিরাপত্তা' : 'Privacy & Security'}
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="py-2.5 px-3 rounded-lg text-left hover:bg-slate-100"
              >
                {language === 'bn' ? 'প্রশ্নোত্তর' : 'FAQ'}
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {currentUser ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToDashboard();
                  }}
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard'}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('signin');
                    }}
                    className="w-full min-h-[44px] py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold text-xs text-center"
                  >
                    {language === 'bn' ? 'লগইন করুন' : 'Log In'}
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('signup');
                    }}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-xs text-center"
                  >
                    {language === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Free Account'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. Hero Section                                                */}
      {/* ------------------------------------------------------------- */}
      <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-sky-100/50 via-sky-50/20 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline, Copy & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
                <span>
                  {language === 'bn'
                    ? '১০০% পারস্পরিক সম্মতিভিত্তিক ট্র্যাকিং আর্কিটেকচার'
                    : '100% Consent-First Location Architecture'}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                {language === 'bn' ? (
                  <>
                    স্বচ্ছ ও নিরাপদ{' '}
                    <span className="text-sky-600">সম্মতিভিত্তিক লাইভ লোকেশন</span> শেয়ারিং
                  </>
                ) : (
                  <>
                    Consent-Driven Real-Time{' '}
                    <span className="text-sky-600">Location Sharing</span>
                  </>
                )}
              </h1>

              {/* Subtitle / Product Description */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {language === 'bn'
                  ? 'পরিবার, ভ্রমণসঙ্গী বা জরুরি প্রয়োজনে লাইভ লোকেশন সমন্বয় করুন সম্পূর্ণ পারস্পরিক সম্মতিতে। কোনো গোপন ট্র্যাকিং বা নজরদারি নেই — প্রাপকের সুস্পষ্ট অনুমোদন ছাড়া কোনো অবস্থান রিপোর্ট করা হয় না এবং যেকোনো মুহূর্তে এক ক্লিকে বাতিল করা যায়।'
                  : 'Coordinate journeys, meetups, and emergency assistance with total transparency. Zero clandestine surveillance, zero unauthorized tracking — every coordinate is shared only after the recipient explicitly consents, with instant one-tap revocation.'}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={handleGetStartedClick}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-bold text-sm shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>
                    {currentUser
                      ? language === 'bn' ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'Go to Dashboard'
                      : language === 'bn' ? 'বিনামূল্যে শুরু করুন' : 'Get Started Now'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-all cursor-pointer"
                >
                  {language === 'bn' ? 'কীভাবে কাজ করে জানুন' : 'How It Works'}
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-200/80 text-left">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'bn' ? 'স্পষ্ট সম্মতি' : 'Zero Stealth'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'bn' ? 'কোনো গোপন ট্র্যাকিং নয়' : 'Never covert'}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'bn' ? 'তাত্ক্ষণিক বাতিল' : '1-Tap Revoke'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'bn' ? 'যেকোনো মুহূর্তে স্টপ' : 'Stops immediately'}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'bn' ? 'SHA-256 সুরক্ষিত' : 'Hashed Links'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'bn' ? 'এনক্রিপ্ট করা টোকেন' : 'Encrypted tokens'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Original Map-Inspired Interactive Preview */}
            <div className="lg:col-span-5 relative">
              <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200/80 relative overflow-hidden">
                {/* Decorative map grid background */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#0284c7 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Live Preview Card Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-900">
                      {language === 'bn' ? 'সরাসরি জিপিএস টেলিমেট্রি প্রিভিউ' : 'Live GPS Telemetry Simulation'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    {currentLandmarkData.status}
                  </span>
                </div>

                {/* Interactive Landmark Switcher Chips */}
                <div className="relative z-10 flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setActiveLandmark('dhaka')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      activeLandmark === 'dhaka'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Dhaka
                  </button>
                  <button
                    onClick={() => setActiveLandmark('chittagong')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      activeLandmark === 'chittagong'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Chittagong
                  </button>
                  <button
                    onClick={() => setActiveLandmark('sylhet')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      activeLandmark === 'sylhet'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Sylhet
                  </button>
                </div>

                {/* Radar Mockup Area */}
                <div className="relative z-10 h-52 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800 shadow-inner">
                  {/* Concentric radar circles */}
                  <div className="absolute w-44 h-44 rounded-full border border-sky-500/20" />
                  <div className="absolute w-28 h-28 rounded-full border border-sky-500/30" />
                  <div className="absolute w-12 h-12 rounded-full border border-sky-500/40" />

                  {/* Pulsing Target Pin */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-sky-500/30 animate-ping absolute" />
                    <div className="w-8 h-8 rounded-full bg-sky-500/60 flex items-center justify-center text-white shadow-lg">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* HUD Info Badges on Radar */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-sky-400">
                    {currentLandmarkData.lat}, {currentLandmarkData.lng}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Acc: {currentLandmarkData.acc}
                  </div>
                </div>

                {/* Telemetry Stats Rows */}
                <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {language === 'bn' ? 'স্থান / এলাকা' : 'Active Locality'}
                    </div>
                    <div className="font-bold text-slate-800 truncate">{currentLandmarkData.city}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {language === 'bn' ? 'গতি ও অবস্থা' : 'Movement Status'}
                    </div>
                    <div className="font-bold text-slate-800 truncate">{currentLandmarkData.speed}</div>
                  </div>
                </div>

                {/* Cryptographic Proof Footnote */}
                <div className="relative z-10 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>SHA-256 Hash Verified</span>
                  <span className="text-emerald-700 font-semibold">Consent Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. How It Works (3 Real Steps)                                 */}
      {/* ------------------------------------------------------------- */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-sky-600 uppercase tracking-widest">
              {language === 'bn' ? 'পদ্ধতি ও কার্যপ্রণালী' : 'Workflow Architecture'}
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'bn'
                ? '৩টি সহজ ও সম্পূর্ণ স্বচ্ছ ধাপে লোকেশন শেয়ারিং'
                : '3 Transparent Steps to Consent-Based Sharing'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'bn'
                ? 'প্রেরক ও প্রাপক উভয় পক্ষের সচেতন অনুমোদন ছাড়া কোনো অবস্থান ডেটা সংরক্ষিত বা সম্প্রচার করা হয় না।'
                : 'Zero covert tracking. Every session requires two-way authorization before coordinates are shared.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-all space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-extrabold text-lg shadow-sm">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {language === 'bn' ? '১. নিরাপদ আমন্ত্রণের লিংক তৈরি' : '1. Create Secure Invitation'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'ড্যাশবোর্ড থেকে উদ্দেশ্য, সময়সীমা (যেমন ১ ঘণ্টা বা যতক্ষণ না থামানো হয়) ও ঐচ্ছিক গন্তব্য লিংক দিয়ে একটি অনন্য ক্রিপ্টোগ্রাফিক লিংক তৈরি করুন।'
                  : 'Specify the purpose, time duration (e.g. 1 hour or until stopped), and an optional destination. An encrypted, single-use SHA-256 hashed link is generated.'}
              </p>
              <div className="pt-2 text-[11px] text-sky-700 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'কাস্টম সময়সীমা নির্ধারণ' : 'Custom duration control'}</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-all space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-extrabold text-lg shadow-sm">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {language === 'bn' ? '২. প্রাপকের সুস্পষ্ট সম্মতি প্রদান' : '2. Recipient Grants Consent'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'প্রাপক তার ব্রাউজারে লিংকটি খুলে প্রেরকের পরিচয় ও উদ্দেশ্য যাচাই করেন। প্রাপক স্বেচ্ছায় "সম্মত হয়ে লোকেশন শেয়ার করুন" বোতামে চাপ দিলে জিপিএস চালু হয়।'
                  : 'The recipient opens the link, inspects requester details and the stated purpose, and explicitly agrees before any browser GPS coordinates are recorded.'}
              </p>
              <div className="pt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ব্রাউজার জিপিএস পারমিশন আবশ্যক' : 'Explicit GPS authorization'}</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-all space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-extrabold text-lg shadow-sm">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {language === 'bn' ? '৩. লাইভ ম্যাপে অবস্থান ও এক-ক্লিকে বাতিল' : '3. Live Map & Instant Revocation'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'অনুমোদিত প্রেরক গুগল ম্যাপস বা লিফলেট ভেক্টরে সরাসরি লাইভ অবস্থান দেখতে পান। প্রাপক বা প্রেরক যেকোনো মুহূর্তে এক ক্লিকে শেয়ারিং বাতিল করতে পারেন।'
                  : 'The authorized requester views high-accuracy coordinates on Google Maps or Leaflet. Either party can terminate sharing instantly with a single click.'}
              </p>
              <div className="pt-2 text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'তাত্ক্ষণিক অ্যাক্সেস বাতিল' : 'One-click access revocation'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. Features Section (Real Implemented Features)                 */}
      {/* ------------------------------------------------------------- */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-sky-600 uppercase tracking-widest">
              {language === 'bn' ? 'বাস্তবায়িত সুবিধাসমূহ' : 'Core Features'}
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'bn'
                ? 'নির্ভরযোগ্য ও নিরাপদ অবস্থান ট্র্যাকিং'
                : 'Engineered for Integrity and Precision'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'bn'
                ? 'কোনো রূপ কাল্পনিক বা বিভ্রান্তিকর ফিচার নয় — অ্যাপে বিদ্যমান প্রতিটি ফিচার বাস্তবায়ন করা হয়েছে সর্বোচ্চ নিরাপত্তা মানদণ্ডে।'
                : 'Real, operational features designed for real-world coordinate sharing, road travel, and emergency coordination.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'প্রাপকের স্পষ্ট অনুমোদন' : 'Explicit Recipient Consent'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'গোপনে বা অননুমোদিতভাবে অবস্থান জানার কোনো সুযোগ নেই। প্রতি সেশনে প্রাপক নিজে পারমিশন প্রদান করেন।'
                  : 'Strict consent enforcement. No coordinates are recorded or viewed without the recipient’s active approval.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'উচ্চ-নির্ভুল লাইভ জিপিএস' : 'High-Precision Live GPS'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'ডিভাইসের হার্ডওয়্যার জিপিএস ব্যবহার করে ৩-৫ মিটার নির্ভুলতার সাথে অক্ষাংশ, দ্রাঘিমাংশ ও গতি পর্যবেক্ষণ।'
                  : 'Native device GPS telemetry reporting real-time coordinates, speed, and accuracy within meters.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'গুগল ম্যাপস ও লিফলেট ভেক্টর' : 'Google Maps + Leaflet Vectors'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'বাংলাদেশের প্রতিটি জেলা, থানা ও রাস্তার বিস্তারিত বিবরণসহ স্মুথ জুম, রিসেন্টারিং ও অটো-ফলো ক্যামেরা।'
                  : 'Interactive vector rendering with auto-follow tracking, smooth panning, and Bangladesh locality street details.'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'তাত্ক্ষণিক অ্যাক্সেস বাতিল' : 'One-Click Revocation'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'প্রেরক বা প্রাপক যেকেউ মুহূর্তের মধ্যে সেশনটি চিরতরে বন্ধ করে দিতে পারেন। ডেটা আদান-প্রদান সাথে সাথে বন্ধ হয়।'
                  : 'Immediate termination. Either requester or recipient can cut the connection with a single tap.'}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'স্মার্ট গন্তব্য লিংক ফিচার' : 'Smart Destination Links'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'অনুরোধের সাথে একটি নির্দিষ্ট ওয়েবসাইট বা গুগল ম্যাপস গন্তব্য যুক্ত করে সরাসরি নেভিগেশন সুবিধা প্রদান।'
                  : 'Attach destination coordinates or external web links for immediate navigational guidance.'}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Languages className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'বাংলা ও ইংরেজি দ্বি-ভাষিক ব্যবস্থা' : 'Dual-Language (English & বাংলা)'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'বাংলাদেশের সকল স্তরের মানুষের ব্যবহারের সুবিধার জন্য সম্পূর্ণ ইন্টারফেস বাংলা ও ইংরেজিতে তাৎক্ষণিক রূপান্তরযোগ্য।'
                  : 'Fully localized user interface with seamless one-click toggling between Bengali and English.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. Privacy & Trust Architecture                                */}
      {/* ------------------------------------------------------------- */}
      <section id="privacy" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <Shield className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'গোপনীয়তা ও নিরাপত্তার নীতিমালা' : 'Privacy Architecture'}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {language === 'bn'
                  ? 'আপনার অবস্থান আপনারই ব্যক্তিগত সম্পদ'
                  : 'Your Coordinates Remain Under Your Absolute Control'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'আমরা এমন এক প্রযুক্তি তৈরি করেছি যা নজরদারি নয়, বরং পারস্পরিক সহায়তা ও নিরাপত্তাকে অগ্রাধিকার দেয়।'
                  : 'We built this system for mutual assistance and reassurance — never covert surveillance or ad profiling.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                  <EyeOff className="w-5 h-5 text-sky-600" />
                  <span>{language === 'bn' ? 'শূন্য ব্যাকগ্রাউন্ড নজরদারি' : 'Zero Stealth Monitoring'}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'bn'
                    ? 'কোনো ব্যবহারকারী লিংক না খুলে ও ব্রাউজারে অনুমতি না দিলে ডিভাইস কখনোই অবস্থান সংকেত পাঠাতে পারে না।'
                    : 'A device cannot and will never transmit location data unless the user actively opens the link and approves.'}
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                  <Clock className="w-5 h-5 text-sky-600" />
                  <span>{language === 'bn' ? 'স্বয়ংক্রিয় সময়সীমা সমাপ্তি' : 'Automatic Time Boundaries'}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'bn'
                    ? 'সেশন চলাকালীন নির্ধারিত সময় শেষ হওয়া মাত্রই সংযোগ বিচ্ছিন্ন হয় এবং লাইভ সিগন্যাল বন্ধ হয়ে যায়।'
                    : 'Configured sessions expire automatically when their timer elapses, preventing forgotten ongoing sessions.'}
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                  <Lock className="w-5 h-5 text-sky-600" />
                  <span>{language === 'bn' ? 'ক্রিপ্টোগ্রাফিক টোকেন সুরক্ষা' : 'SHA-256 Hashed Tokens'}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'bn'
                    ? 'ডাটাবেজে কোনো র লিংক টোকেন রাখা হয় না; প্রতিটি টোকেন ক্রিপ্টোগ্রাফিক হ্যাশ দ্বারা সুরক্ষিত থাকে।'
                    : 'Invitation tokens are stored only as one-way SHA-256 hashes, preventing token scraping or unauthorized replay.'}
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                  <Smartphone className="w-5 h-5 text-sky-600" />
                  <span>{language === 'bn' ? 'প্রাপকের স্ক্রিনে নিয়ন্ত্রণ' : 'Full In-Browser Controls'}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'bn'
                    ? 'লোকেশন শেয়ার করার সময় প্রাপকের স্ক্রিনে সার্বক্ষণিক স্পষ্ট স্টেটাস ও স্টপ বোতাম দৃশ্যমান থাকে।'
                    : 'The sharing party always sees a live active badge with a clear red Stop button to instantly break connection.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. FAQ Accordion                                               */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-xs font-bold text-sky-600 uppercase tracking-widest">
              {language === 'bn' ? 'প্রশ্ন ও উত্তর' : 'Frequently Asked Questions'}
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'bn' ? 'প্রয়োজনীয় তথ্যাবলী' : 'Everything You Need to Know'}
            </h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full min-h-[52px] p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-sky-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. Bottom Call to Action                                       */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 bg-gradient-to-br from-slate-900 to-sky-950 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {language === 'bn'
              ? 'নিরাপদে ও সম্মতির সাথে লাইভ অবস্থান সমন্বয় শুরু করুন'
              : 'Start Sharing Live Coordinates with Complete Consent'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            {language === 'bn'
              ? 'কোনো জটিলতা ছাড়া সরাসরি ওয়েব ব্রাউজার থেকে সুরক্ষিত শেয়ারিং লিংক তৈরি করুন।'
              : 'Generate secure, revocable invitation links directly from your browser in seconds.'}
          </p>
          <div className="pt-2">
            <button
              onClick={handleGetStartedClick}
              className="min-h-[48px] px-8 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-xl shadow-sky-500/30 transition-all active:scale-98 cursor-pointer"
            >
              {currentUser
                ? language === 'bn' ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'Open Dashboard'
                : language === 'bn' ? 'বিনামূল্যে শুরু করুন' : 'Get Started Free'}
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. Footer                                                      */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800">BD Location Assist</span>
              <p className="text-[10px] text-slate-400">
                {language === 'bn' ? 'বাংলাদেশ-কেন্দ্রিক নিরাপদ সম্মতিভিত্তিক লাইভ ট্র্যাকিং' : 'Consent-driven location sharing for Bangladesh'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-medium text-slate-600">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-sky-600">
              {language === 'bn' ? 'পদ্ধতি' : 'How It Works'}
            </button>
            <button onClick={() => scrollToSection('features')} className="hover:text-sky-600">
              {language === 'bn' ? 'ফিচারসমূহ' : 'Features'}
            </button>
            <button onClick={() => scrollToSection('privacy')} className="hover:text-sky-600">
              {language === 'bn' ? 'প্রাইভেসি' : 'Privacy'}
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-sky-600">
              {language === 'bn' ? 'প্রশ্নোত্তর' : 'FAQ'}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 text-center md:text-right">
            © {new Date().getFullYear()} BD Location Assist. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
