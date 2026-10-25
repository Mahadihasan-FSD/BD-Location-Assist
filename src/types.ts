export interface UserProfile {
  id: string;
  email: string;
  name: string;
  token: string;
  avatarUrl?: string;
}

export interface SharingSession {
  id: string;
  ownerId: string;
  purpose: string;
  destinationUrl?: string;
  invitationTokenHash?: string;
  status: 'PENDING_CONSENT' | 'ACTIVE' | 'SHARING' | 'EXPIRED' | 'REVOKED' | 'STOPPED';
  durationMinutes: number | null;
  invitationExpiresAt?: string;
  sessionExpiresAt?: string | null;
  expiresAt: string | null;
  revokedAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  lastAccuracyMeters?: number;
  lastCapturedAt?: string;
  lastReceivedAt?: string;
  createdAt: string;
  isLive?: boolean;
  isStale?: boolean;
  diffSeconds?: number;
  hasLocation?: boolean;
}

export interface LocationTelemetry {
  hasLocation: boolean;
  sessionId?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt?: string;
  receivedAt?: string;
  diffSeconds?: number;
  isLive?: boolean;
  isStale?: boolean;
  status?: string;
  message?: string;
}

export interface InvitationDetails {
  valid: boolean;
  sessionId: string;
  purpose: string;
  destinationUrl?: string;
  durationMinutes: number | null;
  invitationExpiresAt?: string;
  sessionExpiresAt?: string | null;
  expiresAt: string | null;
  requesterName: string;
  requesterEmail: string;
  status: string;
  error?: string;
  code?: string;
}

export interface ReceiverGrant {
  consented: boolean;
  grantToken: string;
  grantId: string;
  sessionId: string;
  expiresAt: string;
  message?: string;
}

// For Phase 2 Android and backward compatibility
export interface RegisteredDevice {
  id: string;
  userId: string;
  deviceName: string;
  model: string;
  manufacturer: string;
  androidVersion: string;
  deviceSecret: string;
  status: 'ACTIVE' | 'PAUSED' | 'UNLINKED';
  recoveryEnabled: boolean;
  batteryLevel: number;
  isCharging: boolean;
  networkType: 'WIFI' | 'CELLULAR' | 'NONE';
  lastSeenAt: string;
  registeredAt: string;
  lastLatitude: number;
  lastLongitude: number;
  lastAccuracyMeters: number;
  lastLocationTimestamp: string;
  lastAddress?: string;
  isOnline?: boolean;
  isStale?: boolean;
  diffMinutes?: number;
}

export interface ShareSession {
  id: string;
  creatorName: string;
  destination: string;
  expiresAt: string;
  latitude: number;
  longitude: number;
  battery: number;
  active: boolean;
}

export interface AuditLog {
  id: string;
  deviceId?: string;
  sessionId?: string;
  action: string;
  details: string;
  timestamp: string;
}
