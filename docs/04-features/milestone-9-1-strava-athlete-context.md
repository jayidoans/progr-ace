# Milestone 9.1 — Athlete context for Strava Activity Evidence

## Domain boundary

Strava remains the authoritative provider for synchronized Activity metrics. An Athlete cannot edit
the source, external identifier, name, sport, start time, distance, duration, heart rate, elevation,
or allow-listed provider metadata on a Strava Activity.

RPE and Notes are different: they are athlete-authored training context stored in the existing
`activities.rpe` and `activities.notes` columns. The owning Athlete may edit those two fields on an
unlocked Strava Activity. Manual Activity editing remains unchanged.

## Security and immutability

Direct authenticated updates to Strava Activity rows remain unavailable under RLS. A narrowly
scoped authenticated RPC derives the Athlete from `auth.uid()`, verifies ownership and the STRAVA
source, validates the existing 1–10 RPE scale and 4,000-character Notes limit, and updates only RPE
and Notes. Provider-owned columns are not parameters of this operation.

The existing submitted-evidence trigger remains authoritative. Once a Strava Activity is referenced
by a SUBMITTED Claim, its RPE and Notes become read-only along with the provider evidence. Evidence
used only by a DRAFT Claim remains editable under the existing M5 lifecycle.

## Synchronization behavior

New Strava Activities start with null RPE and Notes. M8 synchronization updates only provider-owned
fields on existing unlocked Activities and therefore preserves athlete-authored RPE and Notes. No
context is sent to Strava, and OAuth scopes remain unchanged.

This milestone does not change Claim, Validation, compliance, or analytics behavior.
