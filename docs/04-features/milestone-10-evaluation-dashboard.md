# Milestone 10 — Evaluation Dashboard and Training Analytics (MVP)

## Purpose

Milestone 10 presents existing Race Goal, Training Program, Prescription, Claim, Activity Evidence, and Validation data as an operational dashboard for athletes and coaches. It does not introduce a sports-science score, recommendation engine, or persistent analytics model.

M6 Validation remains the authoritative evaluation of submitted training evidence.

## Athlete dashboard

The athlete dashboard shows:

- the current ACTIVE race goal and a derived calendar-day countdown;
- the published program and week containing prescriptions in the current UTC calendar week;
- the current week's prescriptions and their existing Claim/Validation state;
- a session-state distribution;
- prescribed running distance and claimed running distance for that week;
- recent submitted Validation results, including Activity RPE when present; and
- current-week items that still need athlete attention.

The current training week is derived from actual Prescription dates. It is not inferred from account age or an assumed Week 1 start.

## Coach dashboard

COACH sees published programs they created. ADMIN keeps its existing broader authorization behavior. The dashboard provides:

- program-level session-state distributions;
- an alphabetical athlete overview without ranking or performance scoring;
- bounded NEEDS_REVIEW items linked to the existing M6 review route; and
- bounded derived MISSED items.

The normal M6 RLS rules intentionally hide DRAFT Claim contents from coaches. A narrow server-used RPC returns only `program_id`, `prescription_id`, and nullable `claim_status` for authorized programs so the dashboard can distinguish DRAFT from no Claim without exposing notes or evidence. The RPC does not provide an alternate review mechanism.

## Session-based compliance semantics

The dashboard uses the existing M6 states without combining them into an opaque score:

- `VERIFIED`, `PARTIAL`, `NEEDS_REVIEW`, and `REJECTED` come from Validation;
- `DRAFT` and `SUBMITTED` come from Claim lifecycle state;
- a future unclaimed Prescription is `UPCOMING`;
- an unclaimed Prescription scheduled today is `NOT_CLAIMED`; and
- a past Prescription with no Claim is `MISSED`.

No distance ratio is presented as compliance, and over-distance cannot create compliance above 100 percent.

## Weekly distance semantics

Prescribed running distance is the sum of explicit component `target_distance_m` values only when every relevant component has a meaningful distance target. Duration-only, interval-repetition, and otherwise incomplete targets are not fabricated.

Actual weekly running distance includes only RUNNING Activity Evidence attached to SUBMITTED Claims for prescriptions in the current week. Activities are deduplicated by Activity ID. Unclaimed synced Strava runs and DRAFT Claim evidence do not count as completed prescribed training.

Distance remains informational; it never replaces Validation.

## RPE and notes

RPE may be displayed as athlete-authored context in recent Validation results. RPE does not alter Validation or compliance. Activity notes remain in existing detail experiences and are not broadly surfaced by the dashboard.

## Authorization and performance boundaries

Existing RLS remains active for Profiles, Race Goals, Programs, Claims, Activities, and Validation. Queries are server-side, program lists and operational lists are bounded, and raw Strava data is never loaded or displayed.

No persistent analytics table, materialized score, cache, background job, or expanded Strava scope is introduced.

## Known limitations

- Calendar-week and race-countdown calculations use UTC date-only semantics, matching current Prescription/Validation behavior. Global athlete timezone preferences are not introduced in this milestone.
- The coach dashboard is bounded to 12 recent published authorized programs and eight operational items per list.
- A Training Program currently belongs to one athlete Race Goal, so multi-athlete program cohorts are represented as multiple existing program records.
- Prescriptions without complete explicit distance targets are reported as not specified rather than estimated.
