-- BD Location Assist Database Schema Migration
-- Migration: 20261025_init_bd_location_assist.sql
-- Supports PostgreSQL and Supabase Auth with Row Level Security (RLS)

-- 1. Create Users Table (for app-level or Supabase auth pairing)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Sharing Sessions Table
CREATE TABLE IF NOT EXISTS public.sharing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    destination_url TEXT,
    invitation_token_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_CONSENT' 
        CHECK (status IN ('PENDING_CONSENT', 'ACTIVE', 'SHARING', 'EXPIRED', 'REVOKED', 'STOPPED')),
    duration_minutes INT NOT NULL DEFAULT 60,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    last_accuracy_meters DOUBLE PRECISION,
    last_captured_at TIMESTAMPTZ,
    last_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Receiver Grants Table (Explicit Consent Grants)
CREATE TABLE IF NOT EXISTS public.receiver_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
    grant_token_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'STOPPED', 'EXPIRED', 'REVOKED')),
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT
);

-- 4. Create Location Records Table (Telemetry Ingestion)
CREATE TABLE IF NOT EXISTS public.location_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES public.receiver_grants(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    accuracy_meters DOUBLE PRECISION NOT NULL CHECK (accuracy_meters >= 0),
    altitude_meters DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Audit Logs Table (Tamper-evident logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal lookup performance and token matching
CREATE INDEX IF NOT EXISTS idx_sessions_owner ON public.sharing_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sharing_sessions(invitation_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sharing_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_grants_session ON public.receiver_grants(session_id);
CREATE INDEX IF NOT EXISTS idx_grants_token_hash ON public.receiver_grants(grant_token_hash);
CREATE INDEX IF NOT EXISTS idx_locations_session ON public.location_records(session_id, recorded_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiver_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Owners can read and write only their own sessions
CREATE POLICY "Owners can manage their own sessions"
ON public.sharing_sessions
FOR ALL
USING (auth.uid() = owner_id);

-- Locations can only be viewed by the session owner
CREATE POLICY "Owners can view locations of their sessions"
ON public.location_records
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sharing_sessions s 
        WHERE s.id = location_records.session_id AND s.owner_id = auth.uid()
    )
);

-- Function to prune expired location records after 24 hours (Data Minimization Policy)
CREATE OR REPLACE FUNCTION public.cleanup_expired_telemetry()
RETURNS void AS $$
BEGIN
    DELETE FROM public.location_records
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
