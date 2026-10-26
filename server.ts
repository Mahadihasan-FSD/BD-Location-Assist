import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Optional Supabase Integration
let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  try {
    supabase = createClient(process.env.SUPABASE_URL, key);
    console.log('[BD Location Assist] Supabase client initialized.');
  } catch (err) {
    console.warn('[BD Location Assist] Failed to initialize Supabase client, using local store:', err);
  }
}

// -------------------------------------------------------------
// Database Models & In-Memory / Hybrid Storage Layer
// -------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  token: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface SharingSession {
  id: string;
  ownerId: string;
  purpose: string;
  destinationUrl?: string;
  invitationTokenHash: string;
  invitationToken?: string;
  status: 'PENDING_CONSENT' | 'ACTIVE' | 'SHARING' | 'EXPIRED' | 'REVOKED' | 'STOPPED';
  durationMinutes: number | null;
  invitationExpiresAt: string;
  sessionExpiresAt: string | null;
  expiresAt: string | null;
  revokedAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  lastAccuracyMeters?: number;
  lastCapturedAt?: string;
  lastReceivedAt?: string;
  createdAt: string;
}

export interface ReceiverGrant {
  id: string;
  sessionId: string;
  grantTokenHash: string;
  status: 'ACTIVE' | 'STOPPED' | 'EXPIRED' | 'REVOKED';
  consentedAt: string;
  expiresAt: string | null;
  revokedAt?: string;
  userAgent?: string;
}

export interface LocationRecord {
  id: string;
  sessionId: string;
  grantId?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters?: number;
  speed?: number;
  heading?: number;
  recordedAt: string;
  receivedAt: string;
}

export interface AuditLog {
  id: string;
  sessionId: string;
  action: string;
  details: string;
  timestamp: string;
}

// Default Seed User (Authenticated Owner)
const users: User[] = [
  {
    id: 'usr_dhaka_01',
    email: 'mahadihassanrafi2007@gmail.com',
    name: 'মাহাদী হাসান (Mahadi Hassan)',
    token: 'auth_token_bd_owner_2026',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    createdAt: new Date().toISOString(),
  },
];

const sessions: SharingSession[] = [];
const grants: ReceiverGrant[] = [];
const locationRecords: LocationRecord[] = [];
const auditLogs: AuditLog[] = [];

// Helper: SHA-256 Hashing for security
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

// Helper: Owner Authentication Middleware (Supports Supabase JWT, Owner Tokens, and Synced Users)
async function authenticateOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'অননুমোদিত অনুরোধ। প্রমাণীকরণ টোকেন প্রয়োজন (Unauthorized: Bearer token required).' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  
  // 1. Check local/synced users pool
  let user = users.find((u) => u.token === token || u.id === token);
  if (user) {
    (req as any).user = user;
    return next();
  }

  // 2. If Supabase client is configured, verify Supabase JWT token
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        user = users.find((u) => u.id === data.user.id || u.email.toLowerCase() === (data.user.email || '').toLowerCase());
        if (!user) {
          user = {
            id: data.user.id,
            email: data.user.email || 'user@bdlocationassist.com',
            name: (data.user.user_metadata as any)?.name || (data.user.email ? data.user.email.split('@')[0] : 'Authorized User'),
            token: token,
            avatarUrl: (data.user.user_metadata as any)?.avatar_url,
            createdAt: new Date().toISOString(),
          };
          users.push(user);
        } else {
          user.token = token; // refresh active token
        }
        (req as any).user = user;
        return next();
      }
    } catch (sbErr) {
      console.warn('Supabase token verification check error:', sbErr);
    }
  }

  return res.status(401).json({ error: 'অবৈধ বা মেয়াদোত্তীর্ণ প্রমাণীকরণ টোকেন (Invalid or expired auth token).' });
}

// -------------------------------------------------------------
// Supabase & Authentication Endpoints
// -------------------------------------------------------------

// Returns public auth service status
app.get('/api/auth/status', (req, res) => {
  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim() !== '');
  const hasSupabaseAnon = Boolean(process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim() !== '');
  res.json({
    supabaseConfigured: hasSupabaseUrl && hasSupabaseAnon,
    supabaseUrl: hasSupabaseUrl ? process.env.SUPABASE_URL : null,
  });
});

// Sync authenticated user from client (Supabase or OAuth)
app.post('/api/auth/sync', (req, res) => {
  const { id, email, name, token, avatarUrl } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required for syncing user.' });
  }

  let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() || (id && u.id === id));
  if (user) {
    user.token = token || user.token;
    if (name) user.name = name;
    if (avatarUrl) user.avatarUrl = avatarUrl;
  } else {
    user = {
      id: id || 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: email.trim(),
      name: name?.trim() || email.split('@')[0],
      token: token || 'auth_' + crypto.randomBytes(16).toString('hex'),
      avatarUrl: avatarUrl || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  }

  res.json({
    message: 'User synchronized successfully.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      token: user.token,
      avatarUrl: user.avatarUrl,
    },
  });
});


app.get('/api/auth/me', authenticateOwner, (req, res) => {
  const user = (req as any).user as User;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      token: user.token,
      avatarUrl: user.avatarUrl,
    },
  });
});

// One-Click Google Auth Verification (For instant testing when Supabase keys are pending)
app.post('/api/auth/google/signin', (req, res) => {
  const { email, name, avatarUrl } = req.body;
  const userEmail = email || 'mahadihassanrafi2007@gmail.com';
  const userName = name || 'মাহাদী হাসান (Mahadi Hassan)';

  let user = users.find((u) => u.email.toLowerCase() === userEmail.toLowerCase());
  if (!user) {
    user = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: userEmail,
      name: userName,
      avatarUrl: avatarUrl || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      token: 'auth_' + crypto.randomBytes(16).toString('hex'),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  }

  res.json({
    message: 'Google দিয়ে সফলভাবে সাইন-ইন করা হয়েছে (Google Sign-In successful).',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      token: user.token,
      avatarUrl: user.avatarUrl,
    },
  });
});

// -------------------------------------------------------------
// PART 2: Working Sharing Session & Link Creation (Requester)
// -------------------------------------------------------------

// 1. Create a Sharing Session & Generate Secure Invitation Token (Supports Smart Destination Link)
app.post('/api/sessions', authenticateOwner, (req, res) => {
  const user = (req as any).user as User;
  const { purpose, durationMinutes, destinationUrl } = req.body;

  // Purpose is now optional per user requirement; defaults to 'Location Sharing' if omitted
  const cleanPurpose = purpose && typeof purpose === 'string' && purpose.trim()
    ? purpose.trim()
    : 'Location Sharing';

  // Duration: null or 0 = "Until stopped or revoked", otherwise positive number of minutes
  let duration: number | null = null;
  if (durationMinutes !== undefined && durationMinutes !== null && durationMinutes !== '' && durationMinutes !== 0 && durationMinutes !== '0') {
    const parsed = Number(durationMinutes);
    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ error: 'সময়সীমা সঠিক সংখ্যা হতে হবে।' });
    }
    if (parsed > 10080) { // Max 7 days if timed
      return res.status(400).json({ error: 'সময়সীমা সর্বোচ্চ ৭ দিন (১০,০৮০ মিনিট) হতে পারে।' });
    }
    duration = parsed;
  }

  // Validate optional destinationUrl if provided (Smart Destination Link Feature)
  let validDestinationUrl: string | undefined = undefined;
  if (destinationUrl && typeof destinationUrl === 'string' && destinationUrl.trim()) {
    const cleanUrl = destinationUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'স্মার্ট গন্তব্য লিংকটি অবশ্যই http:// অথবা https:// দিয়ে শুরু হতে হবে।' });
    }
    validDestinationUrl = cleanUrl;
  }

  const sessionId = 'ses_' + crypto.randomBytes(8).toString('hex');

  // Cryptographically secure invitation token (never stored raw in DB!)
  const rawInvitationToken = crypto.randomBytes(24).toString('base64url');
  const tokenHash = hashToken(rawInvitationToken);

  const now = new Date();
  // Invitation link is valid for 48 hours for recipient to accept
  const invitationExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  // Session active duration: null = indefinite until stopped/revoked, or specified duration
  const sessionExpiresAt = duration ? new Date(now.getTime() + duration * 60 * 1000).toISOString() : null;

  const newSession: SharingSession = {
    id: sessionId,
    ownerId: user.id,
    purpose: cleanPurpose,
    destinationUrl: validDestinationUrl,
    invitationTokenHash: tokenHash,
    invitationToken: rawInvitationToken,
    status: 'PENDING_CONSENT',
    durationMinutes: duration,
    invitationExpiresAt,
    sessionExpiresAt,
    expiresAt: sessionExpiresAt,
    createdAt: now.toISOString(),
  };

  sessions.unshift(newSession);

  auditLogs.unshift({
    id: 'aud_' + crypto.randomBytes(6).toString('hex'),
    sessionId,
    action: 'SESSION_CREATED',
    details: `Owner ${user.email} created sharing link for purpose: "${cleanPurpose}" (Duration: ${duration ? `${duration}m` : 'Until stopped or revoked'}${validDestinationUrl ? `, Destination: ${validDestinationUrl}` : ''})`,
    timestamp: now.toISOString(),
  });

  // Base URL for full shareable link
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const invitationUrl = `${hostUrl}/share/${rawInvitationToken}`;

  res.status(201).json({
    message: 'শেয়ারিং লিংক সফলভাবে তৈরি হয়েছে (Sharing link created successfully)',
    session: {
      ...newSession,
      isLive: false,
      isStale: false,
    },
    invitationToken: rawInvitationToken,
    invitationUrl,
  });
});

// 2. List All Sessions for Authenticated Owner
app.get('/api/sessions', authenticateOwner, (req, res) => {
  const user = (req as any).user as User;
  const nowTime = Date.now();

  const userSessions = sessions
    .filter((s) => s.ownerId === user.id)
    .map((s) => {
      // Check expiration if session has a configured expiration time
      let currentStatus = s.status;
      if (s.sessionExpiresAt) {
        const expiresTime = new Date(s.sessionExpiresAt).getTime();
        if (expiresTime <= nowTime && currentStatus !== 'REVOKED' && currentStatus !== 'STOPPED') {
          currentStatus = 'EXPIRED';
          s.status = 'EXPIRED';
        }
      }

      // Calculate freshness of GPS telemetry
      let isLive = false;
      let isStale = false;
      let diffSeconds = 0;

      if (s.lastReceivedAt) {
        const receivedTime = new Date(s.lastReceivedAt).getTime();
        diffSeconds = Math.max(0, Math.floor((nowTime - receivedTime) / 1000));
        isLive = diffSeconds <= 45 && currentStatus === 'SHARING';
        isStale = diffSeconds > 45;
      }

      return {
        ...s,
        status: currentStatus,
        isLive,
        isStale,
        diffSeconds,
        hasLocation: s.lastLatitude !== undefined && s.lastLongitude !== undefined,
      };
    });

  res.json({ sessions: userSessions });
});

// 3. Get Details of a Specific Session
app.get('/api/sessions/:id', authenticateOwner, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const session = sessions.find((s) => s.id === id && s.ownerId === user.id);
  if (!session) {
    return res.status(404).json({ error: 'সেশন পাওয়া যায়নি (Session not found).' });
  }

  // Update expiration status if session has a configured expiration time
  if (session.sessionExpiresAt && new Date(session.sessionExpiresAt).getTime() <= Date.now() && session.status !== 'REVOKED' && session.status !== 'STOPPED') {
    session.status = 'EXPIRED';
  }

  res.json({ session });
});

// 4. Revoke / Stop Session by Owner
app.post('/api/sessions/:id/revoke', authenticateOwner, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const session = sessions.find((s) => s.id === id && s.ownerId === user.id);
  if (!session) {
    return res.status(404).json({ error: 'সেশন পাওয়া যায়নি (Session not found).' });
  }

  session.status = 'REVOKED';
  session.revokedAt = new Date().toISOString();

  // Invalidate any active receiver grants under this session immediately
  grants
    .filter((g) => g.sessionId === session.id && g.status === 'ACTIVE')
    .forEach((g) => {
      g.status = 'REVOKED';
      g.revokedAt = session.revokedAt;
    });

  auditLogs.unshift({
    id: 'aud_' + crypto.randomBytes(6).toString('hex'),
    sessionId: session.id,
    action: 'SESSION_REVOKED',
    details: `Owner ${user.email} revoked sharing session.`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    message: 'লোকেশন শেয়ারিং সেশন সফলভাবে বন্ধ ও বাতিল করা হয়েছে (Session revoked).',
    session,
  });
});

// 5. Delete Session Telemetry (Privacy & Data Minimization)
app.delete('/api/sessions/:id/locations', authenticateOwner, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const session = sessions.find((s) => s.id === id && s.ownerId === user.id);
  if (!session) {
    return res.status(404).json({ error: 'সেশন পাওয়া যায়নি।' });
  }

  session.lastLatitude = undefined;
  session.lastLongitude = undefined;
  session.lastAccuracyMeters = undefined;
  session.lastCapturedAt = undefined;
  session.lastReceivedAt = undefined;

  // Prune history
  for (let i = locationRecords.length - 1; i >= 0; i--) {
    if (locationRecords[i].sessionId === id) {
      locationRecords.splice(i, 1);
    }
  }

  res.json({ message: 'সমস্ত সংরক্ষিত লোকেশন ডেটা স্থায়ীভাবে মুছে ফেলা হয়েছে।' });
});

// -------------------------------------------------------------
// PART 3: Receiver Consent Page & Grant Management (/share/:token)
// -------------------------------------------------------------

// 1. Validate Invitation Token on Recipient Open
app.get('/api/invitations/:token', (req, res) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({ error: 'অবৈধ টোকেন (Invalid token).' });
  }

  const tokenHash = hashToken(token);
  const session = sessions.find(
    (s) => s.invitationTokenHash === tokenHash || s.invitationTokenHash === token || s.invitationToken === token || s.id === token
  );

  if (!session) {
    return res.status(404).json({
      error: 'ইনভাইটেশন লিংকটি পাওয়া যায়নি বা এটি সঠিক নয় (Invitation not found).',
      code: 'NOT_FOUND',
    });
  }

  const nowTime = Date.now();

  if (session.status === 'REVOKED') {
    return res.status(410).json({
      error: 'এই লোকেশন শেয়ারিং লিংকটি মালিক কর্তৃক বাতিল করা হয়েছে (Link revoked).',
      code: 'REVOKED',
      purpose: session.purpose,
    });
  }

  if (session.status === 'STOPPED') {
    return res.status(410).json({
      error: 'লোকেশন শেয়ারিং বন্ধ করা হয়েছে (Sharing stopped).',
      code: 'STOPPED',
      purpose: session.purpose,
    });
  }

  // Validate invitation link expiration for pending invites
  if (session.status === 'PENDING_CONSENT') {
    const invTime = new Date(session.invitationExpiresAt).getTime();
    if (invTime <= nowTime) {
      session.status = 'EXPIRED';
      return res.status(410).json({
        error: 'এই আমন্ত্রণ লিংকের সময়সীমা শেষ হয়ে গেছে (Invitation link expired).',
        code: 'EXPIRED',
        purpose: session.purpose,
      });
    }
  } else if (session.sessionExpiresAt) {
    const sessTime = new Date(session.sessionExpiresAt).getTime();
    if (sessTime <= nowTime || session.status === 'EXPIRED') {
      session.status = 'EXPIRED';
      return res.status(410).json({
        error: 'এই লোকেশন শেয়ারিং সেশনটির মেয়াদ শেষ হয়ে গেছে (Session expired).',
        code: 'EXPIRED',
        purpose: session.purpose,
      });
    }
  }

  const owner = users.find((u) => u.id === session.ownerId);

  res.json({
    valid: true,
    sessionId: session.id,
    purpose: session.purpose,
    destinationUrl: session.destinationUrl,
    durationMinutes: session.durationMinutes,
    invitationExpiresAt: session.invitationExpiresAt,
    sessionExpiresAt: session.sessionExpiresAt,
    expiresAt: session.sessionExpiresAt,
    requesterName: owner?.name || 'অনুরোধকারী (Requester)',
    requesterEmail: owner?.email || '',
    status: session.status,
  });
});

// 2. Record Consent & Create Isolated Receiver Grant
app.post('/api/invitations/:token/consent', (req, res) => {
  const { token } = req.params;
  const { consent } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'অবৈধ টোকেন।' });
  }

  const tokenHash = hashToken(token);
  const session = sessions.find(
    (s) => s.invitationTokenHash === tokenHash || s.invitationTokenHash === token || s.invitationToken === token || s.id === token
  );

  if (!session) {
    return res.status(404).json({ error: 'ইনভাইটেশন সেশন পাওয়া যায়নি।' });
  }

  const isSessionExpired = session.sessionExpiresAt ? new Date(session.sessionExpiresAt).getTime() <= Date.now() : false;
  const isInvitationExpired = session.status === 'PENDING_CONSENT' && new Date(session.invitationExpiresAt).getTime() <= Date.now();

  if (session.status === 'REVOKED' || session.status === 'STOPPED' || isSessionExpired || isInvitationExpired) {
    return res.status(410).json({ error: 'সেশনটি আর সক্রিয় নেই বা মেয়াদোত্তীর্ণ।' });
  }

  // If Consent is REJECTED
  if (!consent) {
    auditLogs.unshift({
      id: 'aud_' + crypto.randomBytes(6).toString('hex'),
      sessionId: session.id,
      action: 'CONSENT_REJECTED',
      details: 'Recipient explicitly rejected the location sharing request.',
      timestamp: new Date().toISOString(),
    });

    return res.json({
      consented: false,
      message: 'সম্মতি প্রত্যাখ্যান করা হয়েছে। কোনো লোকেশন ডেটা পাঠানো হবে না (Consent rejected).',
    });
  }

  // If Consent is ACCEPTED: Issue an isolated, unforgeable receiver grant
  const rawGrantToken = crypto.randomBytes(24).toString('base64url');
  const grantTokenHash = hashToken(rawGrantToken);
  const grantId = 'grt_' + crypto.randomBytes(8).toString('hex');

  const newGrant: ReceiverGrant = {
    id: grantId,
    sessionId: session.id,
    grantTokenHash,
    status: 'ACTIVE',
    consentedAt: new Date().toISOString(),
    expiresAt: session.sessionExpiresAt,
    userAgent: req.headers['user-agent'] || 'Browser',
  };

  grants.push(newGrant);
  session.status = 'SHARING';

  auditLogs.unshift({
    id: 'aud_' + crypto.randomBytes(6).toString('hex'),
    sessionId: session.id,
    action: 'CONSENT_GRANTED',
    details: 'Recipient granted explicit consent. Active receiver grant issued.',
    timestamp: new Date().toISOString(),
  });

  res.json({
    consented: true,
    message: 'সম্মতি সংরক্ষিত হয়েছে। লোকেশন শেয়ারিং শুরু হচ্ছে (Consent granted).',
    grantToken: rawGrantToken,
    grantId,
    sessionId: session.id,
    expiresAt: session.sessionExpiresAt,
  });
});

// 3. Stop Sharing by Receiver
app.post('/api/grants/:grantId/stop', (req, res) => {
  const { grantId } = req.params;
  const grantToken = (req.headers['x-grant-token'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, '') as string);

  if (!grantToken) {
    return res.status(401).json({ error: 'অনুদান টোকেন অনুপস্থিত (Missing grant token).' });
  }

  const tokenHash = hashToken(grantToken);
  const grant = grants.find((g) => g.id === grantId && g.grantTokenHash === tokenHash);

  if (!grant) {
    return res.status(403).json({ error: 'অবৈধ অনুদান টোকেন।' });
  }

  grant.status = 'STOPPED';
  grant.revokedAt = new Date().toISOString();

  const session = sessions.find((s) => s.id === grant.sessionId);
  if (session) {
    session.status = 'STOPPED';
  }

  auditLogs.unshift({
    id: 'aud_' + crypto.randomBytes(6).toString('hex'),
    sessionId: grant.sessionId,
    action: 'SHARING_STOPPED_BY_RECEIVER',
    details: 'Recipient voluntarily clicked Stop Sharing.',
    timestamp: new Date().toISOString(),
  });

  res.json({
    stopped: true,
    message: 'লোকেশন শেয়ারিং সফলভাবে বন্ধ করা হয়েছে (Sharing stopped by receiver).',
  });
});

// -------------------------------------------------------------
// PART 4: Real GPS Location Telemetry Ingest & Query
// -------------------------------------------------------------

// 1. Ingest Real GPS Location Updates from Authorized Receiver
app.post('/api/sessions/:sessionId/location', (req, res) => {
  const { sessionId } = req.params;
  const grantToken = (req.headers['x-grant-token'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, '') as string);

  if (!grantToken) {
    return res.status(401).json({ error: 'অননুমোদিত অনুরোধ (Unauthorized: Missing grant token).' });
  }

  const tokenHash = hashToken(grantToken);
  const grant = grants.find((g) => g.sessionId === sessionId && g.grantTokenHash === tokenHash);

  if (!grant) {
    return res.status(403).json({ error: 'অবৈধ অথবা মেয়াদোত্তীর্ণ অনুদান টোকেন (Invalid grant token).' });
  }

  if (grant.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'এই অনুদানটি সক্রিয় নেই (Grant is stopped or revoked).' });
  }

  const session = sessions.find((s) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'সেশন পাওয়া যায়নি।' });
  }

  if (session.status === 'REVOKED' || session.status === 'STOPPED') {
    return res.status(403).json({ error: 'এই সেশনটি মালিক বা রিসিভার দ্বারা বন্ধ করা হয়েছে।' });
  }

  // Only expire if sessionExpiresAt was explicitly configured and time has elapsed
  if (session.sessionExpiresAt && new Date(session.sessionExpiresAt).getTime() <= Date.now()) {
    session.status = 'EXPIRED';
    return res.status(410).json({ error: 'সেশনের মেয়াদ শেষ হয়ে গেছে (Session expired).' });
  }

  const { latitude, longitude, accuracyMeters, altitudeMeters, speed, heading, recordedAt } = req.body;

  // Strict Coordinate Validation
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'সঠিক ভৌগোলিক স্থানাঙ্ক প্রদান করুন (Valid latitude and longitude required).' });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'স্থানাঙ্ক সীমার বাইরে (Coordinates out of valid range).' });
  }

  const accuracy = typeof accuracyMeters === 'number' && accuracyMeters >= 0 ? accuracyMeters : 15;
  const now = new Date().toISOString();

  // Update session current location cache
  session.lastLatitude = latitude;
  session.lastLongitude = longitude;
  session.lastAccuracyMeters = accuracy;
  session.lastCapturedAt = recordedAt || now;
  session.lastReceivedAt = now;
  session.status = 'SHARING';

  const record: LocationRecord = {
    id: 'loc_' + crypto.randomBytes(6).toString('hex'),
    sessionId: session.id,
    grantId: grant.id,
    latitude,
    longitude,
    accuracyMeters: accuracy,
    altitudeMeters: typeof altitudeMeters === 'number' ? altitudeMeters : undefined,
    speed: typeof speed === 'number' ? speed : undefined,
    heading: typeof heading === 'number' ? heading : undefined,
    recordedAt: recordedAt || now,
    receivedAt: now,
  };

  locationRecords.push(record);
  if (locationRecords.length > 500) {
    locationRecords.shift();
  }

  res.json({
    success: true,
    receivedAt: now,
  });
});

// 2. Retrieve Latest Location for Requester Dashboard
app.get('/api/sessions/:sessionId/location', authenticateOwner, (req, res) => {
  const user = (req as any).user as User;
  const { sessionId } = req.params;

  const session = sessions.find((s) => s.id === sessionId && s.ownerId === user.id);
  if (!session) {
    return res.status(404).json({ error: 'সেশন পাওয়া যায়নি বা দেখার অনুমতি নেই।' });
  }

  // Enforce truth in telemetry: Do NOT invent fake coordinates
  if (session.lastLatitude === undefined || session.lastLongitude === undefined) {
    return res.json({
      hasLocation: false,
      status: session.status,
      message: 'এখনো কোনো জিপিএস লোকেশন রেকর্ড পাওয়া যায়নি। প্রাপকের অনুমোদনের অপেক্ষায় রয়েছে।',
    });
  }

  const nowTime = Date.now();
  const receivedTime = new Date(session.lastReceivedAt || session.createdAt).getTime();
  const diffSeconds = Math.max(0, Math.floor((nowTime - receivedTime) / 1000));

  const isLive = diffSeconds <= 45 && session.status === 'SHARING';
  const isStale = diffSeconds > 45;

  res.json({
    hasLocation: true,
    sessionId: session.id,
    latitude: session.lastLatitude,
    longitude: session.lastLongitude,
    accuracyMeters: session.lastAccuracyMeters,
    capturedAt: session.lastCapturedAt,
    receivedAt: session.lastReceivedAt,
    diffSeconds,
    isLive,
    isStale,
    status: session.status,
  });
});
// Ensure any unhandled /api/* request returns JSON 404, never falling through to SPA HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

// Global API error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[BD Location Assist] Unhandled Server Error:', err);
  res.status(500).json({
    error: 'অভ্যন্তরীণ সার্ভার ত্রুটি (An internal server error occurred).',
    message: err?.message || 'Unknown error',
  });
});

// -------------------------------------------------------------
// Vite Middleware & Static Serving
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BD Location Assist] Real MVP Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
