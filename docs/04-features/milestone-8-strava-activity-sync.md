# Milestone 8 — Strava Activity Sync

## Domain boundary

Milestone 8 imports Strava activities into the existing ProgrACE Activity Evidence model:

`Strava → Activity Evidence`

It does not create or suggest Prescriptions, Claims, Validation, compliance, or Evaluation. Strava
provides evidence; ProgrACE continues to own all training logic.

## Synchronization window

Synchronization is initiated explicitly by an authenticated Athlete. The first successful sync uses
a bounded 30-day backfill. Later syncs start from the saved activity cursor with a 24-hour overlap.
The cursor advances only after every Strava page has been validated and the normalized Activities
have been committed atomically.

Pagination uses 100 Activities per request and a fixed safety page limit. Reaching the limit with a
full final page fails the sync rather than recording an incomplete success. No background polling or
OAuth-callback synchronization occurs.

## Normalization and idempotency

Strava SummaryActivity data is validated with Zod and normalized into `activities`. Canonical units
remain meters and seconds, while pace remains derived. Unknown or ambiguous Strava sports map to
`OTHER`; they never silently become `RUNNING`. Only allow-listed provider metadata is retained in
`raw_data`, excluding maps, GPS coordinates, polylines, laps, streams, and segments.

The existing partial unique index on `(source, external_activity_id)` is the duplicate barrier.
Repeated synchronization inserts new evidence once, updates unlocked Strava evidence, and reports
unchanged rows without creating duplicates. Manual Activities are never converted or overwritten.

## Historical evidence protection

An Activity referenced by a submitted Claim remains completely immutable. Sync skips such rows and
reports them as locked rather than weakening or bypassing the M5 database trigger. Existing
Validation records are never recalculated or mutated.

Absence from `/athlete/activities` is not treated as deletion. Local evidence is retained because a
bounded or incremental response cannot prove provider deletion. Definitive deletion reconciliation
requires a future webhook milestone.

## Credentials, errors, and rate limits

M8 reuses the M7 encrypted credential store and `getValidStravaAccessToken()` refresh service. Tokens
never reach browser code. Sync database functions are executable only through the server-only
Supabase privileged path, while the Athlete identity is first derived from the verified session.

Authorization failures transition the connection to `REAUTH_REQUIRED`. Rate limiting preserves the
cursor and records `RATE_LIMITED`; it does not hold a Cloudflare request open. Provider, network, and
schema failures preserve existing evidence and leave the previous cursor unchanged.

## Deferred work

Prescription matching, Claim creation or suggestions, Validation changes, analytics, webhooks,
maps, laps, streams, segments, and scheduled synchronization remain out of scope.
