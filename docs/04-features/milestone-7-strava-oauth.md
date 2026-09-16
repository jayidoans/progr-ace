# Milestone 7 — Strava OAuth connection

## Domain boundary

Strava is an Activity Evidence provider. It does not own Training Programs, Prescriptions, Claims,
Validation, or Evaluation. Milestone 7 establishes only a secure connection lifecycle. It does not
fetch, import, backfill, match, or subscribe to Strava activities; those operations remain M8+.

## Authorization and state

Only an authenticated profile with the existing `ATHLETE` role can initiate OAuth. The server
generates a 256-bit random state, stores only its SHA-256 hash, binds it to `auth.uid()`, and also
sets the original value in a short-lived HttpOnly, SameSite=Lax callback cookie. State expires after
ten minutes and is deleted atomically on its first callback attempt. Missing, malformed, expired,
mismatched, cross-athlete, and replayed states are rejected.

The callback URL is derived from the configured trusted `NEXT_PUBLIC_SITE_URL`, never an incoming
Host header. Requested scopes are exactly `read,activity:read_all`. Both callback scopes and the
validated token response are checked. Insufficient permission stores a `REAUTH_REQUIRED` status
instead of silently declaring the connection usable.

## Connection and credential storage

`strava_connections` has one row per ProgrACE athlete and a globally unique Strava athlete ID.
Safe status metadata is owner-readable through column-level grants and forced RLS. Direct browser
insert, update, delete, OAuth-state access, and token-column selection are revoked.

Access and refresh tokens are independently encrypted with AES-256-GCM in the server runtime. Each
encryption uses a fresh 96-bit IV and additional authenticated data bound to the ProgrACE athlete ID
and token type. `STRAVA_TOKEN_ENCRYPTION_KEY` is a server-only base64-encoded 32-byte key. The
database stores ciphertext and IVs; no database function returns plaintext tokens.

State RPCs use an empty search path, derive ownership from `auth.uid()`, and require the `ATHLETE`
role. Credential persistence, encrypted credential reads, refresh leases, and deletion are callable
only by the server-only Supabase secret role. The application first verifies the athlete's normal
Supabase session, then passes that verified profile ID through the privileged server client. Browser
sessions have no EXECUTE privilege on any credential RPC.

## Refresh concurrency

Access tokens are refreshed when they expire within one hour. A database row lock establishes a
short refresh lease and increments a generation. Concurrent requests receive `BUSY` and retry the
winner's stored token. Completion must present both the lease UUID and generation, preventing a
late request from overwriting newer credentials. Every successful refresh persists the latest
access token, rotated refresh token, and expiry. Failure releases its own lease without replacing
credentials.

## Disconnect

Disconnect decrypts the owner's refresh token only on the server and calls Strava's recommended
`POST https://www.strava.com/oauth/revoke` endpoint with HTTP Basic application authentication.
The local connection is removed only after a successful HTTP 200. Provider failure leaves local
credentials intact for a safe retry and returns a user-safe error.

## Environment and production acceptance

Configure names only through local secret files and Cloudflare runtime variables/secrets:

- `STRAVA_CLIENT_ID` — runtime variable (not secret).
- `STRAVA_CLIENT_SECRET` — Cloudflare Secret.
- `STRAVA_TOKEN_ENCRYPTION_KEY` — Cloudflare Secret containing base64 for exactly 32 random bytes.
- `SUPABASE_SECRET_KEY` — Cloudflare Secret used only by server routes/actions for narrow credential RPCs.

Generate the encryption key outside source control, for example with a password manager or a
cryptographically secure 32-byte base64 generator, and place it directly into the secret store.
Never paste it into source, migrations, logs, screenshots, or support messages.

Manual production acceptance is: sign in as an athlete, open **Integrations → Strava**, connect,
verify the exact read scopes, return to the connection page, log out/in to confirm persistence,
verify no tokens appear in URLs/page source/storage/network JSON, disconnect, and reconnect. No
activity synchronization should occur during this test.
