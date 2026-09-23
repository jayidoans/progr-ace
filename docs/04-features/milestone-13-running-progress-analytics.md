# Milestone 13.1 — Running progress analytics foundation

## Purpose

M13 provides descriptive, longitudinal answers about what happened during one Athlete's Training Program. It does not estimate fitness, predict race performance, recommend training, or replace Coach judgment.

M6 remains authoritative for evaluating an individual submitted Claim. M10 remains the operational view of what needs attention now. M13 reuses those results to describe volume and session outcomes over time without introducing a score or a second evaluator.

## Inclusion rules

The analytics boundary is one Athlete and one authorized Training Program. Only stored `PUBLISHED` Training Weeks contribute. Missing weeks remain unplanned, DRAFT weeks remain unassigned, and neither creates a missed consequence.

Activity evidence contributes only through this path:

`Training Program → PUBLISHED Week → Prescription → SUBMITTED Claim → Claim Activity → Activity`

DRAFT Claim evidence and unrelated or unclaimed Strava Activities do not contribute. Running mileage includes only Activities whose normalized `sport_type` is `RUNNING`; strength, walking, cycling, padel, and other activities are excluded. Activity IDs are deduplicated before aggregation.

## Weekly running volume

Prescribed running distance uses explicit component distance data. A direct `target_distance_m` is used as stored. When a component explicitly stores repetitions and distance per repetition, their product is used consistently with the existing Training Plan distance helper. A direct distance target takes precedence so it is not double-counted.

Duration is never converted into estimated distance. The weekly result separately reports duration-only running prescriptions and components. When no explicit running distance exists, prescribed distance remains `null` rather than zero.

Actual running distance is the sum of unique RUNNING Activity distances attached to SUBMITTED Claims in the Program. Missing Activity distance stays missing; future or unclaimed evidence is not represented as zero.

## Session outcomes

Weekly outcome counts call the existing M10/M6 compliance derivation. Validation results remain `VERIFIED`, `PARTIAL`, `NEEDS_REVIEW`, or `REJECTED`; a submitted Claim without a Validation remains `SUBMITTED`. Existing calendar semantics derive `MISSED`, `NOT_CLAIMED`, and `UPCOMING`. A DRAFT Claim may be described as DRAFT, but its Activities never contribute to actual metrics.

## Running session trends

Session trend records are available for the existing running menus `EASY`, `MEDIUM`, `LONG`, and `SPEED`. They retain the Prescription, week, phase, component targets, submitted Claim, Activity context, and existing Validation result.

Whole-session pace is derived only when every contributing RUNNING Activity has positive distance and duration:

`pace_sec_per_km = total_duration_sec / (total_distance_m / 1000)`

For multiple Activities, distance and duration are summed before calculating pace. Individual paces are never averaged. SPEED sessions expose only whole-session observations; they do not claim that intervals or recoveries were executed correctly.

## Heart rate and RPE

Activity-level average heart rate and RPE remain raw contextual values. A session-level HR or RPE context is exposed only for a single RUNNING Activity. Multi-Activity sessions preserve each Activity's values and do not average them. M13 does not infer zones or calculate session-RPE load.

## Time and history

The foundation returns published weeks from Program start through the current UTC calendar date. The week whose stored date range contains today is marked current/in progress. Future Program weeks are left to Training Schedule planning.

Race Goal completion does not remove analytics history. A PUBLISHED historical Program remains analyzable when its Race Goal is `COMPLETED`.

## Authorization and query strategy

Authorization uses the authenticated identity and actual database roles. An Athlete may read their own PUBLISHED Program, a Coach may read a Program they created, and an Admin retains broader access. Active Mode is never authorization. The loader first performs a bounded identity/ownership check, then retrieves the selected Program graph in one RLS-protected relational query. Coach/Admin requests also reuse the existing M10 claim-state RPC once for the selected Program so a hidden DRAFT Claim is not misclassified as MISSED; the RPC exposes no evidence or notes. The loader does not perform per-week, per-Claim, or per-Activity queries.

No migration, analytics table, materialized view, service-role client, or new privileged RPC is introduced. The response excludes raw Strava payloads, tokens, and provider credentials.

## Known limitations and out of scope

- UTC date-only semantics remain consistent with M6/M10.
- Athlete access to archived Programs remains governed by existing RLS; completed Race Goals whose Program remains PUBLISHED are supported.
- Missing distance, duration, HR, and RPE are not estimated.
- No charts or final M13 dashboard are included in M13.1.
- VO2Max, fitness/readiness/load scores, HR zones, laps, streams, interval validation, race prediction, recommendations, race results, and automatic Program changes remain out of scope.
