import { supabase, isSupabaseConfigured, getAuthToken, getStoredUser } from '../lib/supabase';
import { SharingSession, LocationTelemetry, InvitationDetails, ReceiverGrant } from '../types';

// In-browser SHA-256 hashing for invitation tokens
export async function hashTokenBrowser(token: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(token.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// In-browser high-entropy random token generator
export function generateRandomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Local cache for raw invitation tokens (since database stores only the SHA-256 hash)
const INVITATION_TOKEN_STORAGE_KEY = 'bdla_invitation_tokens';

function getStoredInvitationTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(INVITATION_TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function storeInvitationToken(sessionId: string, rawToken: string) {
  try {
    const tokens = getStoredInvitationTokens();
    tokens[sessionId] = rawToken;
    localStorage.setItem(INVITATION_TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (err) {
    console.warn('Failed to cache invitation token in localStorage:', err);
  }
}

export interface CreateSessionParams {
  purpose?: string;
  durationMinutes?: number | null;
  destinationUrl?: string;
}

export interface CreateSessionResult {
  session: SharingSession;
  invitationToken: string;
  invitationUrl: string;
}

/**
 * Creates a new location sharing session.
 * Operates directly against Supabase if configured and authenticated,
 * with automatic fallback to the local API endpoint.
 */
export async function createSharingSession(params: CreateSessionParams): Promise<CreateSessionResult> {
  const user = getStoredUser();
  const token = getAuthToken();

  if (!user || !user.id) {
    throw new Error('অনুগ্রহ করে প্রথমে সাইন ইন করুন (Please sign in to create a tracking link).');
  }

  const cleanPurpose = params.purpose && params.purpose.trim() ? params.purpose.trim() : 'Location Sharing';

  // Duration: null = indefinite, or positive number
  let duration: number | null = null;
  if (params.durationMinutes !== undefined && params.durationMinutes !== null && params.durationMinutes > 0) {
    duration = Number(params.durationMinutes);
  }

  const validDestinationUrl = params.destinationUrl && params.destinationUrl.trim()
    ? params.destinationUrl.trim()
    : undefined;

  const rawToken = generateRandomToken();
  const tokenHash = await hashTokenBrowser(rawToken);

  const now = new Date();
  const invitationExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const sessionExpiresAt = duration ? new Date(now.getTime() + duration * 60 * 1000).toISOString() : null;

  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  const invitationUrl = `${origin}/share/${rawToken}`;

  // PATH 1: Direct Supabase Database Insert (Production Vercel & Direct Architecture)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sharing_sessions')
        .insert({
          owner_id: user.id,
          purpose: cleanPurpose,
          destination_url: validDestinationUrl || null,
          invitation_token_hash: tokenHash,
          status: 'PENDING_CONSENT',
          duration_minutes: duration,
          invitation_expires_at: invitationExpiresAt,
          session_expires_at: sessionExpiresAt,
          expires_at: sessionExpiresAt,
        })
        .select()
        .single();

      if (!error && data) {
        storeInvitationToken(data.id, rawToken);

        const newSession: SharingSession = {
          id: data.id,
          ownerId: data.owner_id || user.id,
          purpose: data.purpose || cleanPurpose,
          destinationUrl: data.destination_url || undefined,
          invitationTokenHash: data.invitation_token_hash || tokenHash,
          invitationToken: rawToken,
          status: data.status || 'PENDING_CONSENT',
          durationMinutes: data.duration_minutes ?? duration,
          invitationExpiresAt: data.invitation_expires_at || invitationExpiresAt,
          sessionExpiresAt: data.session_expires_at || sessionExpiresAt,
          expiresAt: data.expires_at || sessionExpiresAt,
          createdAt: data.created_at || now.toISOString(),
          isLive: false,
          isStale: false,
        };

        return {
          session: newSession,
          invitationToken: rawToken,
          invitationUrl,
        };
      } else if (error) {
        console.warn('Supabase session creation notice:', error.message, error.details);
      }
    } catch (sbErr) {
      console.warn('Direct Supabase session insert error, attempting fallback:', sbErr);
    }
  }

  // PATH 2: Fallback to Backend Route /api/sessions (Express Dev Server)
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        purpose: cleanPurpose,
        durationMinutes: duration,
        destinationUrl: validDestinationUrl,
      }),
    });

    if (!res.ok) {
      let errMsg = '';
      try {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const errData = await res.json();
          errMsg = errData.error || errData.message;
        }
      } catch {}

      if (!errMsg) {
        if (res.status === 401) {
          errMsg = 'লগইন সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার সাইন ইন করুন (Session expired. Please sign in again).';
        } else if (res.status === 404) {
          errMsg = 'ডাটাবেজ সংযোগ বিচ্ছিন্ন বা Vercel এনভায়রনমেন্ট কনফিগারেশন অনুপস্থিত (Database or environment configuration missing).';
        } else {
          errMsg = `লিংক তৈরি ব্যর্থ হয়েছে (HTTP ${res.status}): অনুগ্রহ করে ইন্টারনেট এবং সাইন ইন স্ট্যাটাস পরীক্ষা করুন।`;
        }
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (data?.session) {
      if (data.session.id && data.invitationToken) {
        storeInvitationToken(data.session.id, data.invitationToken);
      }
      return {
        session: data.session,
        invitationToken: data.invitationToken || rawToken,
        invitationUrl: data.invitationUrl || invitationUrl,
      };
    }

    throw new Error('সার্ভার থেকে সঠিক সেশন তথ্য পাওয়া যায়নি (Invalid response received).');
  } catch (fetchErr: any) {
    throw new Error(fetchErr?.message || 'লিংক তৈরি করতে ব্যর্থ হয়েছে (Failed to create session).');
  }
}

/**
 * Fetches all sharing sessions belonging to the authenticated user.
 */
export async function fetchUserSessions(): Promise<SharingSession[]> {
  const user = getStoredUser();
  const token = getAuthToken();
  const tokenCache = getStoredInvitationTokens();

  // PATH 1: Direct Supabase Fetch
  if (isSupabaseConfigured() && user?.id) {
    try {
      const { data, error } = await supabase
        .from('sharing_sessions')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const nowTime = Date.now();
        return data.map((s): SharingSession => {
          let currentStatus = s.status;
          if (s.session_expires_at) {
            const expiresTime = new Date(s.session_expires_at).getTime();
            if (expiresTime <= nowTime && currentStatus !== 'REVOKED' && currentStatus !== 'STOPPED') {
              currentStatus = 'EXPIRED';
            }
          }

          let isLive = false;
          let isStale = false;
          let diffSeconds = 0;

          if (s.last_received_at) {
            const receivedTime = new Date(s.last_received_at).getTime();
            diffSeconds = Math.max(0, Math.floor((nowTime - receivedTime) / 1000));
            isLive = diffSeconds <= 20 && currentStatus === 'SHARING';
            isStale = diffSeconds > 60 && currentStatus === 'SHARING';
          }

          const rawToken = tokenCache[s.id] || s.invitation_token;
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const destinationUrl = s.destination_url || undefined;

          return {
            id: s.id,
            ownerId: s.owner_id,
            purpose: s.purpose || 'Location Sharing',
            destinationUrl,
            invitationTokenHash: s.invitation_token_hash,
            invitationToken: rawToken,
            status: currentStatus,
            durationMinutes: s.duration_minutes,
            invitationExpiresAt: s.invitation_expires_at,
            sessionExpiresAt: s.session_expires_at,
            expiresAt: s.expires_at || s.session_expires_at,
            revokedAt: s.revoked_at,
            lastLatitude: s.last_latitude ? Number(s.last_latitude) : undefined,
            lastLongitude: s.last_longitude ? Number(s.last_longitude) : undefined,
            lastAccuracyMeters: s.last_accuracy_meters ? Number(s.last_accuracy_meters) : undefined,
            lastCapturedAt: s.last_captured_at,
            lastReceivedAt: s.last_received_at,
            createdAt: s.created_at,
            isLive,
            isStale,
            diffSeconds,
            hasLocation: Boolean(s.last_latitude && s.last_longitude),
          };
        });
      }
    } catch (sbErr) {
      console.warn('Supabase sessions query error, falling back to backend:', sbErr);
    }
  }

  // PATH 2: Fallback to Backend Route
  try {
    const res = await fetch('/api/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const data = await res.json();
        return data.sessions || [];
      }
    }
  } catch (e) {
    console.warn('Backend fetchSessions error:', e);
  }

  return [];
}

/**
 * Revokes / stops an active sharing session.
 */
export async function revokeSharingSession(sessionId: string): Promise<boolean> {
  const token = getAuthToken();

  // PATH 1: Direct Supabase Update
  if (isSupabaseConfigured()) {
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('sharing_sessions')
        .update({
          status: 'REVOKED',
          revoked_at: nowIso,
        })
        .eq('id', sessionId);

      if (!error) return true;
    } catch (e) {
      console.warn('Supabase revoke session error:', e);
    }
  }

  // PATH 2: Backend Route Fallback
  try {
    const res = await fetch(`/api/sessions/${sessionId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches the latest authorized location telemetry for an active session.
 */
export async function fetchSessionTelemetry(sessionId: string): Promise<LocationTelemetry | null> {
  const token = getAuthToken();

  // PATH 1: Direct Supabase Query
  if (isSupabaseConfigured()) {
    try {
      // 1. Get latest record from location_records
      const { data: recs } = await supabase
        .from('location_records')
        .select('*')
        .eq('session_id', sessionId)
        .order('recorded_at', { ascending: false })
        .limit(1);

      // 2. Get session status
      const { data: sess } = await supabase
        .from('sharing_sessions')
        .select('status, last_latitude, last_longitude, last_accuracy_meters, last_captured_at, last_received_at')
        .eq('id', sessionId)
        .single();

      const latest = recs && recs.length > 0 ? recs[0] : null;
      const lat = latest?.latitude ?? sess?.last_latitude;
      const lng = latest?.longitude ?? sess?.last_longitude;
      const accuracy = latest?.accuracy_meters ?? sess?.last_accuracy_meters;
      const capturedAt = latest?.recorded_at ?? sess?.last_captured_at;
      const receivedAt = latest?.created_at ?? sess?.last_received_at;

      if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
        const now = Date.now();
        const diffSeconds = receivedAt ? Math.max(0, Math.floor((now - new Date(receivedAt).getTime()) / 1000)) : 0;
        const isLive = diffSeconds <= 20 && sess?.status === 'SHARING';
        const isStale = diffSeconds > 60 && sess?.status === 'SHARING';

        return {
          hasLocation: true,
          sessionId,
          latitude: Number(lat),
          longitude: Number(lng),
          accuracyMeters: accuracy ? Number(accuracy) : 10,
          capturedAt,
          receivedAt,
          diffSeconds,
          isLive,
          isStale,
          status: sess?.status || 'SHARING',
        };
      }
    } catch (e) {
      console.warn('Supabase telemetry fetch error:', e);
    }
  }

  // PATH 2: Backend Route Fallback
  try {
    const res = await fetch(`/api/sessions/${sessionId}/location`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch (e) {
    console.warn('Backend fetchSessionTelemetry error:', e);
  }

  return null;
}

/**
 * Validates an invitation token for the recipient consent page.
 */
export async function validateInvitationToken(rawToken: string): Promise<InvitationDetails> {
  const tokenHash = await hashTokenBrowser(rawToken);

  // PATH 1: Direct Supabase Fetch
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sharing_sessions')
        .select(`
          id,
          purpose,
          destination_url,
          duration_minutes,
          invitation_expires_at,
          session_expires_at,
          expires_at,
          status,
          owner_id
        `)
        .eq('invitation_token_hash', tokenHash)
        .single();

      if (!error && data) {
        if (data.status === 'REVOKED') {
          return {
            valid: false,
            sessionId: data.id,
            purpose: data.purpose,
            durationMinutes: data.duration_minutes,
            expiresAt: data.expires_at,
            requesterName: 'User',
            requesterEmail: '',
            status: 'REVOKED',
            error: 'এই শেয়ারিং লিংকটি প্রেরক কর্তৃক বাতিল করা হয়েছে (This link was revoked by the sender).',
            code: 'SESSION_REVOKED',
          };
        }

        const now = Date.now();
        if (data.invitation_expires_at && new Date(data.invitation_expires_at).getTime() < now) {
          return {
            valid: false,
            sessionId: data.id,
            purpose: data.purpose,
            durationMinutes: data.duration_minutes,
            expiresAt: data.expires_at,
            requesterName: 'User',
            requesterEmail: '',
            status: 'EXPIRED',
            error: 'এই আমন্ত্রণের মেয়াদ উত্তীর্ণ হয়ে গেছে (This invitation link has expired).',
            code: 'INVITATION_EXPIRED',
          };
        }

        // Try getting owner profile
        let ownerName = 'BD Location Assist User';
        let ownerEmail = '';
        if (data.owner_id) {
          const { data: owner } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', data.owner_id)
            .single();
          if (owner) {
            ownerName = owner.name || ownerName;
            ownerEmail = owner.email || '';
          }
        }

        return {
          valid: true,
          sessionId: data.id,
          purpose: data.purpose || 'Location Sharing',
          destinationUrl: data.destination_url || undefined,
          durationMinutes: data.duration_minutes,
          invitationExpiresAt: data.invitation_expires_at,
          sessionExpiresAt: data.session_expires_at,
          expiresAt: data.expires_at,
          requesterName: ownerName,
          requesterEmail: ownerEmail,
          status: data.status,
        };
      }
    } catch (e) {
      console.warn('Supabase validateInvitationToken error:', e);
    }
  }

  // PATH 2: Backend Route Fallback
  const res = await fetch(`/api/invitations/${rawToken}`);
  if (!res.ok) {
    let errMsg = 'আমন্ত্রণ লিংকটি খুঁজে পাওয়া যায়নি (Invitation not found).';
    try {
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      }
    } catch {}
    throw new Error(errMsg);
  }

  return await res.json();
}

/**
 * Submits recipient explicit consent or rejection.
 */
export async function submitConsent(
  rawToken: string,
  consent: boolean,
  userAgent?: string
): Promise<ReceiverGrant> {
  const tokenHash = await hashTokenBrowser(rawToken);

  // PATH 1: Direct Supabase Operation
  if (isSupabaseConfigured()) {
    try {
      const { data: session } = await supabase
        .from('sharing_sessions')
        .select('id, duration_minutes, session_expires_at')
        .eq('invitation_token_hash', tokenHash)
        .single();

      if (session) {
        if (!consent) {
          return {
            consented: false,
            grantToken: '',
            grantId: '',
            sessionId: session.id,
            expiresAt: '',
            message: 'আপনি অবস্থান শেয়ারিং প্রত্যাখ্যান করেছেন (Consent rejected).',
          };
        }

        const rawGrantToken = generateRandomToken();
        const grantTokenHash = await hashTokenBrowser(rawGrantToken);
        const now = new Date();
        const expiresAt = session.session_expires_at ||
          (session.duration_minutes ? new Date(now.getTime() + session.duration_minutes * 60 * 1000).toISOString() : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString());

        const { data: grantData, error: grantErr } = await supabase
          .from('receiver_grants')
          .insert({
            session_id: session.id,
            grant_token_hash: grantTokenHash,
            status: 'ACTIVE',
            consented_at: now.toISOString(),
            expires_at: expiresAt,
            user_agent: userAgent || navigator.userAgent,
          })
          .select()
          .single();

        if (!grantErr && grantData) {
          // Update session to ACTIVE or SHARING
          await supabase
            .from('sharing_sessions')
            .update({ status: 'ACTIVE' })
            .eq('id', session.id);

          return {
            consented: true,
            grantToken: rawGrantToken,
            grantId: grantData.id,
            sessionId: session.id,
            expiresAt,
            message: 'সম্মতি সফলভাবে নথিভুক্ত করা হয়েছে (Consent recorded successfully).',
          };
        }
      }
    } catch (e) {
      console.warn('Supabase submitConsent error:', e);
    }
  }

  // PATH 2: Backend Route Fallback
  const res = await fetch(`/api/invitations/${rawToken}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent }),
  });

  if (!res.ok) {
    let errMsg = 'Failed to submit consent.';
    try {
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const errData = await res.json();
        errMsg = errData.error || errData.message || errMsg;
      }
    } catch {}
    throw new Error(errMsg);
  }

  return await res.json();
}

/**
 * Transmits real GPS telemetry update from recipient.
 */
export async function transmitTelemetry(
  sessionId: string,
  grantToken: string,
  coords: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    altitudeMeters?: number;
    speed?: number;
    heading?: number;
    recordedAt: string;
  }
): Promise<boolean> {
  // PATH 1: Direct Supabase Record Insert
  if (isSupabaseConfigured()) {
    try {
      const nowIso = new Date().toISOString();
      const { error: insErr } = await supabase
        .from('location_records')
        .insert({
          session_id: sessionId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy_meters: coords.accuracyMeters,
          altitude_meters: coords.altitudeMeters || null,
          speed: coords.speed || null,
          heading: coords.heading || null,
          recorded_at: coords.recordedAt || nowIso,
        });

      if (!insErr) {
        // Also update session latest values (handled gracefully if trigger or RLS updates)
        try {
          await supabase
            .from('sharing_sessions')
            .update({
              last_latitude: coords.latitude,
              last_longitude: coords.longitude,
              last_accuracy_meters: coords.accuracyMeters,
              last_captured_at: coords.recordedAt || nowIso,
              last_received_at: nowIso,
              status: 'SHARING',
            })
            .eq('id', sessionId);
        } catch {}
        return true;
      }
    } catch (e) {
      console.warn('Supabase transmitTelemetry error:', e);
    }
  }

  // PATH 2: Backend Route Fallback
  try {
    const res = await fetch(`/api/sessions/${sessionId}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Grant-Token': grantToken,
      },
      body: JSON.stringify(coords),
    });
    return res.ok;
  } catch {
    return false;
  }
}
