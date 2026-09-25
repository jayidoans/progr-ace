# Fictional Demo Data Specification

This document designs data for a later Phase 2B local screenshot environment. It does not create records, alter migrations, or authorize use of production data.

## Safety Rules

- All records are synthetic and local-only.
- Use no real personal email address, production UUID, production Race, production Activity, or provider account.
- Local credentials may be generated for Phase 2B, but must be stored outside Git and never appear in screenshots, documentation, or commit history.
- Do not fabricate a Strava OAuth connection. A local Activity may be labeled as a fixture only if it remains clearly synthetic and does not bypass provider security.
- Keep the frozen tag and application baseline immutable.

## Demo Users

| Logical user | Display name | Documentation email pattern | Actual roles | Why needed |
|---|---|---|---|---|
| Athlete A | Alex Runner | `athlete.demo@example.com` | ATHLETE | Own Race Goals, Programs, Activities, Claims, Evaluation, Progress, Race Result, and cancellation request. |
| Athlete B | Taylor Pace | `athlete-b.demo@example.com` | ATHLETE | Destination Athlete for Program Copy and scope-isolation examples. |
| Coach | Coach Demo | `coach.demo@example.com` | COACH | Own Programs, planning, validation, Athlete detail, Race Result, copy, and cancellation review/direct cancellation. |
| Coach B | Coach Other | `coach-b.demo@example.com` | COACH | Unrelated-scope denial/manual verification; do not expose in published screenshots unless needed. |
| Admin | Admin Demo | `admin.demo@example.com` | ADMIN | Manage Users, summary, password assistance, Strava access, and broad authorized views. |

Use synthetic addresses only; the exact local Auth password is a Phase 2B secret outside this document.

## Fictional Race

| Field | Specification |
|---|---|
| Name | ProgrACE Half Marathon 2026 |
| Distance | 21.1 km (21,098 m) |
| Date | Choose a fixed date in the local documentation fixture relative to capture; do not rely on the current production date. |
| Location | Synthetic city/event location |
| Why | One coherent Race supports goal, Program, Race Result, copy, and cancellation screenshots. |

## Race Goals

| Goal | Athlete | Status | Target | Why needed |
|---|---|---|---|---|
| Goal A | Alex Runner | ACTIVE | 02:00:00 | Normal Program, weekly planning, evaluation, Progress, and pre-Race Goal screenshots. |
| Goal B | Alex Runner | COMPLETED | 02:00:00 | Historical goal/Race Result and Coach completion context. Completion audit must be synthetic. |
| Goal C | Taylor Pace | ACTIVE | 02:10:00 | Program Copy destination and Coach Athlete scope. |
| Goal D | Alex Runner | CANCELLED | Factual target | Goal history; not eligible for new Program. |

Race Result may be present only where a later screenshot needs it; it remains separate from goal completion.

## Training Programs and Lifecycle States

Use the minimum stable set needed to avoid repeatedly mutating one Program:

| Program | Linked goal | Status/state | Required content | Documentation purpose |
|---|---|---|---|---|
| Program A — Half Marathon Training Program | Goal A | PUBLISHED, active | Published weeks, current week, all menu examples, submitted/validated Claims | Main Athlete/Coach schedule, Evaluation, Progress, and Race Result context. |
| Program B — Cancellation Request Example | Goal A or a second synthetic ACTIVE goal | PUBLISHED with PENDING request | At least one published week; request reason | Athlete request/pending and Coach review screenshots. |
| Program C — Declined Request Example | Separate synthetic ACTIVE goal | PUBLISHED with DECLINED history | Request plus review reason | Cancellation history explanation if needed. |
| Program D — Cancelled Training Example | Separate synthetic goal | CANCELLED | Historical weeks/Claims and cancellation audit | Cancelled view and upper evaluation boundary. |
| Program E — Draft Program Example | Goal C | DRAFT | Minimal valid draft schedule | Draft deletion screenshot. |
| Program F — Copy Source Program | Goal A or another same-Race goal | PUBLISHED | Representative weeks/components | M14.3 source Program copy. |
| Program G — Copy Destination | Goal C | No Program before copy | ACTIVE destination goal | Confirms destination eligibility without fake second Race. |

If the application requires one Program per goal in a particular fixture, use additional synthetic goals on the same Race rather than mutating historical records during capture.

## Weeks

Program A should contain:

- at least one PUBLISHED current week;
- one earlier PUBLISHED week with factual Claim outcomes;
- one missing in-range week for UNPLANNED display;
- one DRAFT week with a session/component for planner display;
- a final valid week ending no later than Race Date;
- phase labels such as `Base`, `Build`, or `Peak` only as fixture data, not new taxonomy.

Program D should retain published historical weeks but no future expected training after the cancellation effective date.

## Prescriptions and Components

Use the actual Training Menu values:

- EASY
- MEDIUM
- LONG
- SPEED
- STRENGTH

Include:

- an EASY run with explicit distance and duration;
- a MEDIUM run;
- a LONG run with multiple evidence Activities;
- a SPEED Prescription whose component uses `INTERVAL` as Workout Type;
- a STRENGTH Prescription with duration but no running distance;
- a DRAFT session with at least two ordered components;
- one duration-only running session to demonstrate missing prescribed distance rather than an estimate;
- one session with long instructions to verify mobile wrapping.

Components should use realistic meters/seconds and preserve sequence order. Do not create a REST Prescription; an empty day in a published week demonstrates no assigned session.

## Activities

| Activity fixture | Source/type | Purpose |
|---|---|---|
| Easy Run | MANUAL / RUNNING | Single-Activity Claim, pace, HR, RPE. |
| Long Run Part One | MANUAL / RUNNING | Multi-Activity Claim aggregation. |
| Long Run Part Two | MANUAL / RUNNING | Multi-Activity total duration/distance without HR/RPE averaging. |
| Speed Evidence | MANUAL / RUNNING | Whole-session SPEED observation; no interval conclusion. |
| Strength Session | MANUAL / STRENGTH_TRAINING | Demonstrates exclusion from running mileage. |
| Walking/Cycling/Padel examples | MANUAL / corresponding sport type | Optional validation of non-running filtering; exclude from polished main screenshots. |
| Unclaimed Activity | MANUAL / RUNNING | Demonstrates that unclaimed evidence does not enter Program analytics. |

Use factual, plausible distances/times and synthetic notes. Do not infer any health condition.

## Claims and Validation

For Program A, prepare:

- one DRAFT Claim with multiple selectable Activities;
- one SUBMITTED Claim with a single RUNNING Activity and VERIFIED result;
- one SUBMITTED Claim with multi-Activity evidence and PARTIAL result;
- one SUBMITTED Claim with NEEDS_REVIEW;
- one historical submitted result if needed for progress;
- one past published Prescription with no Claim for MISSED;
- one future Prescription for UPCOMING.

Do not place DRAFT Claim evidence into screenshots intended to demonstrate completed analytics.

## Evaluation and Progress State

The fixture should visibly support factual counts for VERIFIED, PARTIAL, NEEDS_REVIEW, REJECTED, MISSED, and UPCOMING without creating a score. Keep the current week incomplete but not falsely labelled MISSED.

Training Progress needs explicit planned distance and submitted RUNNING evidence. Include a duration-only running session and a multi-Activity session to demonstrate the documented missing/aggregation rules.

## Race Result

Create a synthetic FINISHED result only for a Race Date that has arrived in the chosen local fixture clock, with a target/actual difference. Optionally create separate DNF and DNS examples for manual domain review; they are not required for every screenshot.

Do not create a result from Strava fields and do not alter Race Goal completion metadata while creating it.

## Cancellation Fixtures

- PENDING request: non-empty Athlete reason; Program remains PUBLISHED.
- DECLINED request: review decision and optional review reason.
- APPROVED request: Program becomes CANCELLED with actor/time/reason audit.
- Direct cancellation: PUBLISHED owned Program with no PENDING request.
- DRAFT deletion: minimal DRAFT Program, separate from CANCELLED history.

Keep request/review reasons fictional and publication-safe.

## Admin Fixture

Only the minimum needed for screenshots:

- five synthetic accounts with actual role combinations;
- one Athlete with Strava permission/connection state represented safely;
- password status for one target account without exposing a generated password;
- enough role counts to show Accounts/Athletes/Coaches summary.

Do not build a broad fake directory.

## Reproducible Reset Strategy for Phase 2B

```text
checkout immutable copyright baseline
→ verify local Supabase target
→ local Supabase reset/migrations
→ apply documentation-only local seed extension
→ start local application with local-only variables
→ sign in with local demo accounts
→ capture planned routes at fixed viewport/date
→ review privacy checklist
```

The extension should live in an isolated documentation workstream such as `tools/copyright/` or an approved local fixture mechanism, not in production migrations. Phase 2A does not implement it.

## Repository Evidence

- `supabase/config.toml`
- `supabase/seed.sql`
- `src/types/database.ts`
- `src/features/training-import/template.ts`
- `src/features/training/`
- `src/features/activities/`
- `src/features/claims/`
- `src/features/validation/`
- `src/features/evaluation/`
- `src/features/running-analytics/`
- `src/features/race-results/`
- `src/features/training-cancellation/`
