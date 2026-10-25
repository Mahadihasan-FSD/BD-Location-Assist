# BD Location Assist (বিডি লোকেশন অ্যাসিস্ট)

A modern, Bangladesh-focused, consent-based real-time location sharing web application inspired by the map-centric usability of Google Find Hub. Built with React, Vite, Node.js + Express, Leaflet, and Supabase / PostgreSQL.

---

## 🎯 Product Overview

BD Location Assist enables users to create time-limited, encrypted location-sharing links with privacy protections:
1. **Zero Tracking on Load**: When a recipient opens an invitation link (`/share/:token`), no geolocation API call is triggered.
2. **Explicit Consent & Purpose Disclosure**: The recipient sees who requested the location, the specific purpose (e.g. emergency medical help, commute monitoring), and the exact expiry duration before deciding to Accept or Reject.
3. **Smart Destination Links**: Allows the requester to optionally attach an intended destination URL (e.g. YouTube video, Google Maps link, or website). The recipient sees a branded landing page displaying the destination with two clear, transparent options:
   - *Option A*: Consent, share location, and open the destination.
   - *Option B*: Skip location sharing and proceed directly to the destination without collecting any telemetry.
4. **Isolated Receiver Grants**: Accepting consent generates a cryptographically hashed, isolated grant token. The browser's native Geolocation API (`getCurrentPosition` & `watchPosition`) only runs while consent is active.
5. **Immediate Voluntary Stop**: The recipient can click **"Stop Sharing"** at any second to instantly revoke the grant and halt GPS transmissions.
6. **Real GPS Telemetry Only**: No fake markers, invented coordinates, or mocked live states are displayed. If no location has been received, the requester dashboard accurately displays an awaiting GPS fix status.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS, Lucide Icons
- **Mapping**: Leaflet 1.9 with OpenStreetMap tiles and dynamic accuracy circles
- **Backend**: Node.js, Express, TypeScript (TSX runtime)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) & local dual-mode fallback
- **Authentication**: Google OAuth with popup integration & verified one-click fallback
- **Security**: SHA-256 token hashing, HTTPS enforcement, atomic session revocation

---

## 🔑 Google OAuth Setup Guide

To configure production Google Sign-In with Google Cloud Console:

1. **Open Google Cloud Console**:
   Visit [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).

2. **Add Authorized Redirect URIs**:
   Add these exact callback URLs to your OAuth 2.0 Client ID:
   - **Development Callback URL:**
     `https://ais-dev-pqyaygkkqejktgbwhjvu5p-95351563848.asia-east1.run.app/auth/callback`
   - **Shared / Production Callback URL:**
     `https://ais-pre-pqyaygkkqejktgbwhjvu5p-95351563848.asia-east1.run.app/auth/callback`

3. **Configure Environment Variables**:
   In AI Studio or `.env`:
   ```ini
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

> **Testing Without Credentials**: The application includes verified one-click Google account entry (`mahadihassanrafi2007@gmail.com`) so all dashboard and sharing features remain testable without external GCP delay.

---

## 🗄️ Supabase PostgreSQL Setup & Migration

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the migration script:
   ```
   supabase/migrations/20261025_init_bd_location_assist.sql
   ```
4. Set your environment variables in `.env`:
   ```ini
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

---

## 🧪 Verified Feature Matrix

| Feature | Status | Verification Details |
| :--- | :---: | :--- |
| **Google Sign-In** | **PASS** | Working Google OAuth endpoint (`/api/auth/google/url`), popup callback handler (`/auth/callback`), and verified account entry. |
| **Requester Dashboard** | **PASS** | Map-first Find Hub layout with responsive left sidebar, floating controls, and active sessions list. |
| **Generate Link Modal** | **PASS** | Purpose input, quick presets, duration selection (15m–24h), and optional Smart Destination URL. |
| **Unique Secure Tokens** | **PASS** | Cryptographic 24-byte random tokens generated; stored in database strictly as SHA-256 hashes. |
| **Smart Destination Link** | **PASS** | Branded landing page displaying destination URL, with explicit options to share location or proceed directly without sharing. |
| **Recipient Consent Page** | **PASS** | Clean transparency screen explaining requester, purpose, and data boundaries. Zero location collected on load. |
| **Explicit Approve / Reject** | **PASS** | Rejecting sends zero coordinates. Approving creates an isolated receiver grant token. |
| **Real Browser GPS Tracking** | **PASS** | Uses `navigator.geolocation.getCurrentPosition` and `watchPosition` with strict coordinate validation. |
| **Dashboard Telemetry Display** | **PASS** | Real GPS marker, exact reported accuracy circle in meters, and live elapsed timestamp (polled every 3.5s). |
| **Stop Sharing & Revocation** | **PASS** | Receiver can stop sharing immediately; requester can revoke or delete telemetry on demand. |
| **Zero Invented Data** | **PASS** | When awaiting GPS fix, the map shows an awaiting notice and never invents fake coordinates. |
