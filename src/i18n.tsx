import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'bn';

export interface Translations {
  appName: string;
  appBadge: string;
  appSubtitle: string;
  createLinkBtn: string;
  newLinkShort: string;
  googleSignIn: string;
  profileLogout: string;
  languageToggle: string;

  // Sidebar / Sessions
  activeSessions: string;
  noSessionsTitle: string;
  noSessionsDesc: string;
  createFirstLink: string;
  sessionsLoading: string;
  durationUntilStopped: string;
  durationLabel: string;
  destinationLabel: string;
  liveBadge: string;
  pendingBadge: string;
  stoppedBadge: string;
  revokedBadge: string;
  expiredBadge: string;
  copyLink: string;
  copied: string;
  revokeSession: string;
  revokeConfirm: string;
  footerSecurityNotice: string;
  viewSessionsMobile: string;
  sessionsCount: string;

  // Map HUD & Controls
  liveHUD: string;
  staleHUD: string;
  waitingHUD: string;
  coordinates: string;
  accuracy: string;
  highAccuracy: string;
  medAccuracy: string;
  lowAccuracy: string;
  poorAccuracyWarning: string;
  lastUpdated: string;
  secAgo: string;
  minAgo: string;
  justNow: string;
  noRecipientConsentHud: string;
  selectSessionToView: string;
  waitingForSignalTitle: string;
  waitingForSignalDesc: string;
  recenterTitle: string;
  autoFollowOn: string;
  autoFollowOff: string;
  bangladeshOverview: string;
  zoomIn: string;
  zoomOut: string;
  mapProviderGoogle: string;
  mapProviderLeaflet: string;
  googleMapsKeyMissingNotice: string;

  // Create Link Modal
  modalCreateTitle: string;
  modalCreateSubtitle: string;
  purposeLabel: string;
  purposePlaceholder: string;
  destinationInputLabel: string;
  destinationPlaceholder: string;
  destinationHelper: string;
  durationSelectLabel: string;
  durationOptionForever: string;
  durationOption1h: string;
  durationOption2h: string;
  durationOption8h: string;
  durationOption24h: string;
  generatingBtn: string;
  generateBtn: string;
  modalSuccessTitle: string;
  modalSuccessSubtitle: string;
  copyInvitationLink: string;
  linkCopiedNotice: string;
  doneBtn: string;

  // Recipient Consent Page
  consentRequestTitle: string;
  consentRequestSubtitle: string;
  requesterLabel: string;
  purposeCardLabel: string;
  durationCardLabel: string;
  durationCardExpiresAt: string;
  durationCardForever: string;
  smartDestCardTitle: string;
  smartDestCardDesc: string;
  directVisitWithoutShare: string;
  whatDataTitle: string;
  whatData1: string;
  whatData2: string;
  whatData3: string;
  approveAndShareBtn: string;
  approveAndOpenDestBtn: string;
  rejectBtn: string;
  trackingActiveTitle: string;
  activeStatusBadge: string;
  gpsStatusConnected: string;
  gpsStatusUploading: string;
  gpsSeeking: string;
  newGpsFixBtn: string;
  uploadCountLabel: string;
  openDestinationBtn: string;
  destinationOpenedNotice: string;
  stopSharingBtn: string;
  stopSharingNotice: string;
  rejectedTitle: string;
  rejectedDesc: string;
  closeBtn: string;
  stoppedTitle: string;
  stoppedDesc: string;
  returnHomeBtn: string;
  permissionDeniedTitle: string;
  permissionDeniedDesc: string;
  permissionDeniedStep1: string;
  permissionDeniedStep2: string;
  permissionDeniedStep3: string;
  permissionDeniedStep4: string;
  refreshBtn: string;
  invitationUnavailableTitle: string;
  invitationVerifyingTitle: string;
  invitationVerifyingDesc: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appName: 'BD Location Assist',
    appBadge: 'BD Live Tracking',
    appSubtitle: 'Bangladesh-focused consent-based real-time location sharing',
    createLinkBtn: 'Generate Sharing Link',
    newLinkShort: 'New Link',
    googleSignIn: 'Google Sign-In',
    profileLogout: 'Account & Sign-Out',
    languageToggle: 'বাংলা',

    // Sidebar / Sessions
    activeSessions: 'Active Sessions',
    noSessionsTitle: 'No sharing sessions yet',
    noSessionsDesc: 'Click "Generate Sharing Link" to invite a recipient for live GPS tracking.',
    createFirstLink: 'Create First Link',
    sessionsLoading: 'Loading sessions...',
    durationUntilStopped: 'Active until stopped',
    durationLabel: 'Expires:',
    destinationLabel: 'Destination:',
    liveBadge: 'LIVE',
    pendingBadge: 'WAITING',
    stoppedBadge: 'STOPPED',
    revokedBadge: 'REVOKED',
    expiredBadge: 'EXPIRED',
    copyLink: 'Copy Link',
    copied: 'Copied!',
    revokeSession: 'Revoke Session',
    revokeConfirm: 'Are you sure you want to revoke this session?',
    footerSecurityNotice: '🔒 Server-enforced GPS verification. Zero fake or simulated coordinates.',
    viewSessionsMobile: 'View Sessions',
    sessionsCount: 'sessions',

    // Map HUD & Controls
    liveHUD: 'LIVE',
    staleHUD: 'STALE',
    waitingHUD: 'WAITING',
    coordinates: 'Coordinates:',
    accuracy: 'GPS Accuracy:',
    highAccuracy: '(High)',
    medAccuracy: '(Medium)',
    lowAccuracy: '(Low)',
    poorAccuracyWarning: '⚠️ Weak GPS satellite signal. The browser may be using cellular/Wi-Fi triangulation. Enable Precise Location outdoors for exact positioning.',
    lastUpdated: 'Last Updated:',
    secAgo: 's ago',
    minAgo: 'm ago',
    justNow: 'just now',
    noRecipientConsentHud: 'Recipient has not granted consent yet. No fake coordinates displayed.',
    selectSessionToView: 'Select an active session from the list to view real-time location on the map.',
    waitingForSignalTitle: 'Waiting for recipient GPS signal...',
    waitingForSignalDesc: 'Share the invitation link with the recipient. Once they open and grant browser permission, real GPS tracking will appear here.',
    recenterTitle: 'Recenter to latest position',
    autoFollowOn: 'Auto-follow is ON (Click to disable)',
    autoFollowOff: 'Auto-follow is OFF (Click to follow position)',
    bangladeshOverview: 'Bangladesh Overview',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    mapProviderGoogle: 'Google Maps (Official)',
    mapProviderLeaflet: 'OpenStreetMap (Leaflet Fallback)',
    googleMapsKeyMissingNotice: 'Google Maps browser key not detected. Using Leaflet OpenStreetMap fallback.',

    // Create Link Modal
    modalCreateTitle: 'New Location Sharing Link',
    modalCreateSubtitle: 'Consent-driven, cryptographically secured real-time GPS invitation',
    purposeLabel: 'Purpose / Description (Optional)',
    purposePlaceholder: 'e.g., Emergency support, Commute sharing, Meetup coordination',
    destinationInputLabel: 'Smart Destination URL (Optional)',
    destinationPlaceholder: 'e.g., https://youtu.be/... or destination webpage',
    destinationHelper: 'If specified, the recipient can open this URL right after consenting.',
    durationSelectLabel: 'Session Expiry / Tracking Duration',
    durationOptionForever: 'Until stopped or revoked (Recommended)',
    durationOption1h: '1 hour',
    durationOption2h: '2 hours',
    durationOption8h: '8 hours',
    durationOption24h: '24 hours',
    generatingBtn: 'Generating Secure Link...',
    generateBtn: 'Generate Link',
    modalSuccessTitle: 'Location Sharing Link Ready',
    modalSuccessSubtitle: 'Send this unique link to the person whose location you need to track',
    copyInvitationLink: 'Copy Invitation Link',
    linkCopiedNotice: 'Link copied to clipboard!',
    doneBtn: 'Done',

    // Recipient Consent Page
    consentRequestTitle: 'Location Sharing Request',
    consentRequestSubtitle: 'Transparent, consent-based GPS location request',
    requesterLabel: 'Requester:',
    purposeCardLabel: 'Purpose:',
    durationCardLabel: 'Duration:',
    durationCardExpiresAt: 'Expires at',
    durationCardForever: 'Until stopped by you',
    smartDestCardTitle: 'Smart Destination Link Attached',
    smartDestCardDesc: 'The requester attached a destination link to this request. You will be redirected after consenting.',
    directVisitWithoutShare: 'Visit destination directly without sharing location',
    whatDataTitle: 'What data will be shared?',
    whatData1: 'Only your browser and device real-time GPS coordinates are shared.',
    whatData2: 'No camera, microphone, photos, contacts, or files are accessed.',
    whatData3: 'You can tap "Stop Sharing" at any time to immediately revoke access.',
    approveAndShareBtn: 'Approve & Share Live Location',
    approveAndOpenDestBtn: 'Approve, Share Location & Open Destination',
    rejectBtn: 'Reject Request',
    trackingActiveTitle: 'Live Location Sharing Active',
    activeStatusBadge: 'ACTIVE',
    gpsStatusConnected: 'GPS Connected',
    gpsStatusUploading: 'Uploading GPS Fix...',
    gpsSeeking: 'Acquiring GPS satellite fix...',
    newGpsFixBtn: 'Fresh GPS Fix',
    uploadCountLabel: 'Transmissions:',
    openDestinationBtn: 'Open Destination URL',
    destinationOpenedNotice: 'Destination opened in a new tab. Please keep this tracking tab open in the background to ensure continuous live GPS updates.',
    stopSharingBtn: 'Stop Sharing Now',
    stopSharingNotice: 'You can stop sharing anytime. The server will immediately invalidate the grant token.',
    rejectedTitle: 'Location Sharing Rejected',
    rejectedDesc: 'You declined this request. No coordinates or device information have been collected or shared.',
    closeBtn: 'Close',
    stoppedTitle: 'Location Sharing Stopped',
    stoppedDesc: 'Location sharing has been completely terminated. Your server grant token has been permanently invalidated.',
    returnHomeBtn: 'Return to Homepage',
    permissionDeniedTitle: 'Browser Location Permission Blocked',
    permissionDeniedDesc: 'Your browser denied location access. To share your location:',
    permissionDeniedStep1: 'Click the lock (🔒) or site settings icon in your browser address bar.',
    permissionDeniedStep2: 'Locate "Location" under site permissions.',
    permissionDeniedStep3: 'Change setting to "Allow".',
    permissionDeniedStep4: 'Refresh this page.',
    refreshBtn: 'Try Again (Refresh)',
    invitationUnavailableTitle: 'Invitation Link Unavailable',
    invitationVerifyingTitle: 'Verifying Invitation...',
    invitationVerifyingDesc: 'BD Location Assist secure token authentication',
  },
  bn: {
    appName: 'BD Location Assist',
    appBadge: 'বিডি লোকেশন অ্যাসিস্ট',
    appSubtitle: 'বাংলাদেশ-কেন্দ্রিক নিরাপদ সম্মতিভিত্তিক লাইভ লোকেশন শেয়ারিং',
    createLinkBtn: 'শেয়ারিং লিংক তৈরি করুন',
    newLinkShort: 'নতুন লিংক',
    googleSignIn: 'Google সাইন-ইন',
    profileLogout: 'অ্যাকাউন্ট ও লগআউট',
    languageToggle: 'English',

    // Sidebar / Sessions
    activeSessions: 'সক্রিয় সেশনসমূহ',
    noSessionsTitle: 'কোনো সেশন তৈরি হয়নি',
    noSessionsDesc: '"শেয়ারিং লিংক তৈরি করুন" বাটনে ক্লিক করে যাকে ট্র্যাক করতে চান তাকে আমন্ত্রণ পাঠান।',
    createFirstLink: 'প্রথম লিংক তৈরি করুন',
    sessionsLoading: 'সেশন লোড হচ্ছে...',
    durationUntilStopped: 'বন্ধ না করা পর্যন্ত সক্রিয়',
    durationLabel: 'মেয়াদ:',
    destinationLabel: 'গন্তব্য:',
    liveBadge: 'লাইভ',
    pendingBadge: 'অপেক্ষমান',
    stoppedBadge: 'বন্ধ',
    revokedBadge: 'বাতিল',
    expiredBadge: 'মেয়াদোত্তীর্ণ',
    copyLink: 'কপি লিংক',
    copied: 'কপি হয়েছে!',
    revokeSession: 'সেশন বাতিল করুন',
    revokeConfirm: 'আপনি কি নিশ্চিত যে এই সেশনটি বাতিল করতে চান?',
    footerSecurityNotice: '🔒 সার্ভার-অনুমোদিত জিপিএস ট্র্যাকিং। কোনো কাল্পনিক বা নকল লোকেশন প্রদর্শন করা হয় না।',
    viewSessionsMobile: 'সেশন তালিকা দেখুন',
    sessionsCount: 'টি সেশন',

    // Map HUD & Controls
    liveHUD: 'লাইভ',
    staleHUD: 'দেরী হচ্ছে',
    waitingHUD: 'অপেক্ষমান',
    coordinates: 'স্থানাঙ্ক (Coordinates):',
    accuracy: 'জিপিএস নির্ভুলতা:',
    highAccuracy: '(উচ্চ)',
    medAccuracy: '(মধ্যম)',
    lowAccuracy: '(কম)',
    poorAccuracyWarning: '⚠️ ডিভাইসটি স্যাটেলাইট জিপিএস ফিক্স না পেয়ে সেলুলার বা ওয়াই-ফাই নেটওয়ার্ক ব্যবহার করছে। খোলা জায়গায় এলে বা Precise Location অন করলে সঠিক অবস্থান পাওয়া যাবে।',
    lastUpdated: 'সর্বশেষ আপডেট:',
    secAgo: 'সে. আগে',
    minAgo: 'মি. আগে',
    justNow: 'এইমাত্র',
    noRecipientConsentHud: 'প্রাপক এখনো সম্মতি প্রদান করেননি। কোনো কাল্পনিক ডেটা প্রদর্শিত হচ্ছে না।',
    selectSessionToView: 'ম্যাপে রিয়েল-টাইম লোকেশন দেখতে বামপাশের তালিকা থেকে একটি সেশন নির্বাচন করুন।',
    waitingForSignalTitle: 'প্রাপকের জিপিএস সিগন্যালের অপেক্ষায়...',
    waitingForSignalDesc: 'শেয়ারিং লিংকটি প্রাপককে পাঠান। প্রাপক সম্মতি দিয়ে তার ডিভাইসের ব্রাউজার পারমিশন গ্রহণ করলে এখানে স্বয়ংক্রিয়ভাবে আসল জিপিএস ট্র্যাকিং দৃশ্যমান হবে।',
    recenterTitle: 'সর্বশেষ অবস্থানে রিসেন্টার করুন',
    autoFollowOn: 'স্বয়ংক্রিয় ফলো চালু আছে (ক্লিক করে বন্ধ করুন)',
    autoFollowOff: 'স্বয়ংক্রিয় ফলো চালু করুন',
    bangladeshOverview: 'বাংলাদেশ ভিউ',
    zoomIn: 'জুম ইন',
    zoomOut: 'জুম আউট',
    mapProviderGoogle: 'গুগল ম্যাপস (অফিসিয়াল)',
    mapProviderLeaflet: 'ওপেনস্ট্রিটম্যাপ (লিফলেট বিকল্প)',
    googleMapsKeyMissingNotice: 'গুগল ম্যাপস কী পাওয়া যায়নি। ওপেনস্ট্রিটম্যাপ লিফলেট ভিউ ব্যবহৃত হচ্ছে।',

    // Create Link Modal
    modalCreateTitle: 'নতুন লোকেশন শেয়ারিং লিংক',
    modalCreateSubtitle: 'নিরাপদ ও সম্মতিভিত্তিক রিয়েল-টাইম জিপিএস আমন্ত্রণ',
    purposeLabel: 'উদ্দেশ্য বা বিবরণ (ঐচ্ছিক)',
    purposePlaceholder: 'যেমন: জরুরি সহায়তা, ভ্রমণের লাইভ ট্র্যাকিং, ব্যক্তিগত সাক্ষাত',
    destinationInputLabel: 'স্মার্ট গন্তব্য লিংক (ঐচ্ছিক)',
    destinationPlaceholder: 'যেমন: https://youtu.be/... অথবা গন্তব্য ওয়েব ঠিকানা',
    destinationHelper: 'প্রাপক সম্মতি জানানোর সাথে সাথে এই ঠিকানায় যেতে পারবেন।',
    durationSelectLabel: 'সময়সীমা বা ট্র্যাক করার মেয়াদ',
    durationOptionForever: 'বন্ধ বা বাতিল না করা পর্যন্ত (সুপারিশকৃত)',
    durationOption1h: '১ ঘণ্টা',
    durationOption2h: '২ ঘণ্টা',
    durationOption8h: '৮ ঘণ্টা',
    durationOption24h: '২৪ ঘণ্টা',
    generatingBtn: 'নিরাপদ লিংক তৈরি হচ্ছে...',
    generateBtn: 'লিংক তৈরি করুন',
    modalSuccessTitle: 'লোকেশন শেয়ারিং লিংক তৈরি হয়েছে!',
    modalSuccessSubtitle: 'এই লিংকটি যাকে ট্র্যাক করতে চান তাকে পাঠান',
    copyInvitationLink: 'আমন্ত্রণ লিংক কপি করুন',
    linkCopiedNotice: 'লিংকটি ক্লিপবোর্ডে কপি হয়েছে!',
    doneBtn: 'সম্পন্ন',

    // Recipient Consent Page
    consentRequestTitle: 'লোকেশন শেয়ারিং অনুরোধ',
    consentRequestSubtitle: 'স্বচ্ছ ও সম্মতিভিত্তিক জিপিএস অবস্থান অনুরোধ',
    requesterLabel: 'অনুরোধকারী:',
    purposeCardLabel: 'শেয়ার করার উদ্দেশ্য:',
    durationCardLabel: 'সময়সীমা:',
    durationCardExpiresAt: 'পর্যন্ত',
    durationCardForever: 'বন্ধ না করা পর্যন্ত সক্রিয়',
    smartDestCardTitle: 'স্মার্ট গন্তব্য লিংক সংযুক্ত রয়েছে',
    smartDestCardDesc: 'অনুরোধকারী এই আমন্ত্রণের সাথে একটি গন্তব্য লিংক সংযুক্ত করেছেন।',
    directVisitWithoutShare: 'লোকেশন শেয়ার না করে সরাসরি গন্তব্যে যান',
    whatDataTitle: 'কোন তথ্য শেয়ার করা হবে?',
    whatData1: 'শুধুমাত্র আপনার ব্রাউজার ও ডিভাইসের রিয়েল-টাইম জিপিএস স্থানাঙ্ক।',
    whatData2: 'আপনার অনুমতি ব্যতীত কোনো ক্যামেরা, কন্টাক্ট বা ফাইল অ্যাক্সেস করা হয় না।',
    whatData3: 'আপনি যেকোনো মুহূর্তে "শেয়ারিং বন্ধ করুন" চাপতে পারেন।',
    approveAndShareBtn: 'অনুমতি দিন ও লোকেশন শেয়ার করুন',
    approveAndOpenDestBtn: 'অনুমতি দিন, লোকেশন শেয়ার করুন ও গন্তব্যে যান',
    rejectBtn: 'প্রত্যাখ্যান করুন',
    trackingActiveTitle: 'লাইভ লোকেশন শেয়ারিং সক্রিয়',
    activeStatusBadge: 'ACTIVE',
    gpsStatusConnected: 'জিপিএস সংযুক্ত',
    gpsStatusUploading: 'ডাটা আপলোড হচ্ছে...',
    gpsSeeking: 'জিপিএস স্যাটেলাইট ফিক্স খোঁজা হচ্ছে...',
    newGpsFixBtn: 'নতুন GPS ফিক্স',
    uploadCountLabel: 'আপলোড সংখ্যা:',
    openDestinationBtn: 'গন্তব্যে প্রবেশ করুন',
    destinationOpenedNotice: 'গন্তব্য নতুন ট্যাবে খোলা হয়েছে। লাইভ লোকেশন আপডেট অব্যাহত রাখতে এই ট্র্যাকিং ট্যাবটি অবশ্যই ব্যাকগ্রাউন্ডে চালু (খোলা) রাখুন।',
    stopSharingBtn: 'শেয়ারিং বন্ধ করুন',
    stopSharingNotice: 'আপনি যেকোনো সময় এই বাটন চেপে তাৎক্ষণিকভাবে শেয়ারিং বন্ধ করতে পারবেন।',
    rejectedTitle: 'সম্মতি প্রত্যাখ্যান করা হয়েছে',
    rejectedDesc: 'আপনি এই অনুরোধটি প্রত্যাখ্যান করেছেন। আপনার কোনো ভৌগোলিক অবস্থান সংগ্রহ বা প্রেরণ করা হবে না।',
    closeBtn: 'বন্ধ করুন',
    stoppedTitle: 'লোকেশন শেয়ারিং বন্ধ করা হয়েছে',
    stoppedDesc: 'আপনার অবস্থান শেয়ারিং সম্পূর্ণভাবে বন্ধ হয়েছে এবং সার্ভারে আপনার অনুদান টোকেন বাতিল করা হয়েছে।',
    returnHomeBtn: 'হোমপেজে ফিরে যান',
    permissionDeniedTitle: 'ব্রাউজারে লোকেশন অনুমতি বন্ধ রয়েছে',
    permissionDeniedDesc: 'আপনার ডিভাইসের ব্রাউজারে লোকেশন পারমিশন নিষিদ্ধ (Blocked) করা হয়েছে। লোকেশন শেয়ার করতে চাইলে:',
    permissionDeniedStep1: 'ব্রাউজারের অ্যাড্রেস বারের বামে থাকা লক (🔒) আইকনে ট্যাপ করুন।',
    permissionDeniedStep2: 'Permissions / সাইট সেটিংস এ যান।',
    permissionDeniedStep3: 'Location অপশনটি Allow করুন।',
    permissionDeniedStep4: 'পৃষ্ঠাটি রিফ্রেশ করুন।',
    refreshBtn: 'পুনরায় চেষ্টা করুন (Refresh)',
    invitationUnavailableTitle: 'আমন্ত্রণ লিংকটি অনুপলব্ধ',
    invitationVerifyingTitle: 'আমন্ত্রণ যাচাই করা হচ্ছে...',
    invitationVerifyingDesc: 'BD Location Assist সুরক্ষিত সার্ভার যাচাইকরণ',
  },
};

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: translations.en,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // English default for new visitors, check localStorage for saved preference
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('bd_loc_lang');
    if (saved === 'bn' || saved === 'en') {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('bd_loc_lang', lang);
    } catch (e) {
      // storage unavailable
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
