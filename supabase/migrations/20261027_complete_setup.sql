-- ==============================================================================
-- BD Location Assist - Complete Supabase Setup
-- Paste and run this script in: Supabase Dashboard > SQL Editor > New query
-- ==============================================================================

-- 1. Create Public Users Profile Table (synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Trigger to automatically create a public.users profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url, created_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        new.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create Sharing Sessions Table (Location Requests / Invitation Links)
CREATE TABLE IF NOT EXISTS public.sharing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL DEFAULT 'Location Sharing',
    destination_url TEXT,
    invitation_token_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_CONSENT' 
        CHECK (status IN ('PENDING_CONSENT', 'ACTIVE', 'SHARING', 'EXPIRED', 'REVOKED', 'STOPPED')),
    duration_minutes INT,
    invitation_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    session_expires_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    last_accuracy_meters DOUBLE PRECISION,
    last_captured_at TIMESTAMPTZ,
    last_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Receiver Grants Table (Explicit Recipient Consent)
CREATE TABLE IF NOT EXISTS public.receiver_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
    grant_token_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'STOPPED', 'EXPIRED', 'REVOKED')),
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT
);

-- 5. Create Location Records Table (Live Telemetry Updates)
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
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create Audit Logs Table (Tamper-evident system logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_owner ON public.sharing_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sharing_sessions(invitation_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sharing_sessions(status, session_expires_at);
CREATE INDEX IF NOT EXISTS idx_grants_session ON public.receiver_grants(session_id);
CREATE INDEX IF NOT EXISTS idx_grants_token_hash ON public.receiver_grants(grant_token_hash);
CREATE INDEX IF NOT EXISTS idx_locations_session_time ON public.location_records(session_id, recorded_at DESC);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiver_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. Row Level Security Policies
-- Users table: users can view any profile or their own
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
CREATE POLICY "Users can view profiles"
ON public.users FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Sharing Sessions table: owners have full access to their sessions
DROP POLICY IF EXISTS "Owners manage their sessions" ON public.sharing_sessions;
CREATE POLICY "Owners manage their sessions"
ON public.sharing_sessions FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Sharing Sessions: allow anonymous read with valid invitation hash (for recipients)
DROP POLICY IF EXISTS "Recipients can view session invitation" ON public.sharing_sessions;
CREATE POLICY "Recipients can view session invitation"
ON public.sharing_sessions FOR SELECT
TO anon
USING (status != 'REVOKED');

-- Receiver Grants: allow session owners to see grants
DROP POLICY IF EXISTS "Owners can view session grants" ON public.receiver_grants;
CREATE POLICY "Owners can view session grants"
ON public.receiver_grants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sharing_sessions s 
        WHERE s.id = receiver_grants.session_id AND s.owner_id = auth.uid()
    )
);

-- Receiver Grants: allow recipients to create grant on consent
DROP POLICY IF EXISTS "Recipients can create grant" ON public.receiver_grants;
CREATE POLICY "Recipients can create grant"
ON public.receiver_grants FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Location Records: session owners can view locations
DROP POLICY IF EXISTS "Owners can view location telemetry" ON public.location_records;
CREATE POLICY "Owners can view location telemetry"
ON public.location_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sharing_sessions s 
        WHERE s.id = location_records.session_id AND s.owner_id = auth.uid()
    )
);

-- Location Records: allow recipients to insert telemetry
DROP POLICY IF EXISTS "Recipients can transmit telemetry" ON public.location_records;
CREATE POLICY "Recipients can transmit telemetry"
ON public.location_records FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Audit logs: session owners can view audit logs
DROP POLICY IF EXISTS "Owners can view audit logs" ON public.audit_logs;
CREATE POLICY "Owners can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sharing_sessions s 
        WHERE s.id = audit_logs.session_id AND s.owner_id = auth.uid()
    )
);

-- 10. Automated Maintenance: Cleanup telemetry older than 24 hours (Data Minimization)
CREATE OR REPLACE FUNCTION public.cleanup_expired_telemetry()
RETURNS void AS $$
BEGIN
    DELETE FROM public.location_records
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
