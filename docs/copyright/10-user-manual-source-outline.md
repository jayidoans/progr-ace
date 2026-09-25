# Source Outline — BUKU PANDUAN PENGGUNAAN PROGRACE

This outline uses only confirmed Milestone 15 baseline behavior. It is a source plan, not the finished Indonesian-language manual.

## Front Matter

1. Cover
   - ProgrACE name and approved visual identity
   - Official version: **TO BE PROVIDED BY COPYRIGHT OWNER**
   - Copyright owner/institution: **TO BE PROVIDED BY COPYRIGHT OWNER**
2. Copyright Page
   - Holder, creator, year, publication and registration details
   - No credentials or private system identifiers
3. Preface
   - Purpose of the guide and intended users
4. Table of Contents
5. List of Figures
   - Derive from the 38-figure sanitized checklist

## Chapter 1 — Introduction

1.1 Background: need to connect a Race Goal, planned training, factual Activity evidence, review, progress, and Race Day outcome.

1.2 Purpose of ProgrACE: descriptive planning/evidence application; not a medical, fitness-prediction, or AI recommendation system.

1.3 Manual scope: candidate v1.0 through Training Program cancellation.

1.4 Intended users: Athlete, Coach, Admin.

1.5 Core terminology:

- Race and Race Goal
- Training Program, Training Week, Training Prescription, Training Component
- Activity, Claim, Validation, Evaluation, Training Progress
- Race Result and Cancellation Request

1.6 Important distinctions:

- Prescription is assigned work; Activity is evidence.
- Race Goal is intention; Race Result is outcome.
- Active Mode is presentation, not permission.

## Chapter 2 — ProgrACE Overview

2.1 Application concept and primary domain flow.

2.2 User roles and multi-role accounts.

2.3 Main features: goals, Programs, XLSX import, weekly planning, Activities, Claims, Validation, Evaluation, Progress, Race Results, copy, cancellation.

2.4 Strava as an optional permitted Activity source.

2.5 Lifecycle overview diagram:

```text
Race Goal → Training Program → Week → Prescription
                                      ↓
Activity → Claim → Validation → Evaluation / Training Progress
Race Goal → Race Result
```

2.6 Features explicitly outside the baseline: physiological prediction, AI coaching, readiness/fitness scores, role mutation, impersonation.

## Chapter 3 — Accessing ProgrACE

3.1 Supported access model and browser-based platform.

3.2 Registration fields and validation.

3.3 Login and logout.

3.4 Auth callback/email confirmation note; deployment behavior **REQUIRES MANUAL VERIFICATION**.

3.5 Dashboard navigation and Active Mode.

3.6 Profile maintenance.

3.7 Change Password.

3.8 Required password change after Admin assistance.

3.9 Basic session and privacy precautions.

## Chapter 4 — Athlete User Guide

4.1 Athlete dashboard and status terminology.

4.2 Race Goals

- choose Race and set target time;
- update active goal;
- cancel and view history;
- Coach-verified completion;
- distinction from Race Result.

4.3 Personal Training Program

- Program list/statuses;
- current-week focus and previous/next reveal;
- published session versus unplanned/draft behavior;
- Rest/no-session meaning in a published week.

4.4 Activities

- create/edit/delete eligible manual Activity;
- view metrics, RPE, notes, and Claim usage;
- Activity types and missing-data display.

4.5 Strava

- Admin permission;
- connect/reconnect;
- synchronize recent Activities;
- add notes/RPE context;
- disconnect and retained history.

4.6 Claims

- start Claim from published Prescription;
- select one or more Activities;
- edit DRAFT evidence/note;
- submit and understand immutability;
- review validation result.

4.7 Training Evaluation

- UPCOMING, NOT_CLAIMED, DRAFT, SUBMITTED;
- VERIFIED, PARTIAL, NEEDS_REVIEW, REJECTED, MISSED;
- no proprietary score.

4.8 Training Progress

- factual Program summary;
- planned versus completed running distance;
- current week in progress;
- outcomes and menu filter;
- pace, HR, RPE, and multi-Activity limitations.

4.9 Race Result

- availability on/after Race Date;
- FINISHED, DNF, DNS;
- target versus actual difference;
- edit correction and lifecycle independence.

4.10 Request Program Cancellation

- provide reason;
- pending review;
- approved/declined history;
- consequences of CANCELLED status.

## Chapter 5 — Coach User Guide

5.1 Coach dashboard and owned scope.

5.2 Athletes list and Athlete detail.

5.3 Create shared Race records.

5.4 Create Training Program

- eligible ACTIVE Race Goal;
- Program date/Race Date boundaries;
- DRAFT preparation and publication.

5.5 Complete-plan XLSX import

- download template;
- prepare accepted columns/taxonomy;
- upload and preview;
- warnings/errors;
- confirm import and idempotency.

5.6 Progressive Weekly Planner

- UNPLANNED, DRAFT, PUBLISHED;
- Plan This Week/Add Another Week;
- add/edit/delete session;
- add/order components;
- publish non-empty week;
- immutable published schedule;
- planning to Race Date.

5.7 Training Menu and Workout Details

- EASY, MEDIUM, LONG, SPEED, STRENGTH;
- INTERVAL as Workout Type, not Training Menu;
- units for distance, duration, pace, repetition, recovery.

5.8 Claim Validation

- review queue;
- target and submitted evidence;
- automatic checks;
- VERIFIED/PARTIAL/REJECTED decision and notes.

5.9 Athlete Evaluation and Training Progress

- operational attention versus longitudinal history;
- no new performance score;
- conservative SPEED and multi-Activity interpretation.

5.10 Race Goal Completion and Race Result

- Race Date eligibility;
- completion does not mean 100% compliance;
- record/edit FINISHED/DNF/DNS;
- preserved historical Program.

5.11 Copy Training Program

- source ownership and destination eligibility;
- same-Race restriction;
- copied DRAFT content;
- data intentionally not copied.

5.12 Training Program Cancellation

- review Athlete request;
- approve or decline;
- direct cancellation when no request is pending;
- cancellation reason/audit;
- preserved historical data;
- separate DRAFT deletion.

## Chapter 6 — Administrator User Guide

6.1 Admin navigation and actual-role requirement.

6.2 Manage Users summary, directory, search, and multi-role counts.

6.3 Account detail and password assistance.

6.4 Forced user password change and one-time temporary password handling.

6.5 Strava permission and connection management.

6.6 Broader supported Race Goal, Program, progress, Race Result, and cancellation authority.

6.7 Explicit exclusions: no supported user creation/deletion, role mutation, banning, or impersonation.

## Chapter 7 — Training Program Lifecycle

7.1 End-to-end lifecycle:

```text
Race Goal
→ Training Program
→ Import or weekly planning
→ PUBLISHED week and Prescription
→ Activity evidence
→ DRAFT/SUBMITTED Claim
→ Validation
→ Operational Evaluation
→ Longitudinal Training Progress
→ Race Result
```

7.2 Program statuses: DRAFT, PUBLISHED, CANCELLED, ARCHIVED.

7.3 Week semantics: missing/UNPLANNED, DRAFT, PUBLISHED.

7.4 Full import versus progressive planning.

7.5 Lower evaluation boundary: `tracking_start_date` explained in user language as the adoption/tracking start.

7.6 Upper boundary: cancellation effective date; expected training stops before that date while history remains.

7.7 Claim and Validation preservation.

7.8 Race Goal completion versus Program status and Race Result.

7.9 Copy creates a new DRAFT and does not copy evidence/history.

7.10 Cancellation request, direct cancellation, and DRAFT deletion distinctions.

## Chapter 8 — Troubleshooting

Use only repository-backed feedback categories:

8.1 Registration/login/session and forced password change.

8.2 Race Goal invalid target/date or unavailable transition.

8.3 Training Program invalid start date/inactive goal.

8.4 XLSX unsafe file, parse error, expired preview, inactive goal, duplicate/idempotent import.

8.5 Weekly planner invalid dates, empty-week publication, published immutability, Race boundary.

8.6 Activity validation and submitted-evidence edit/delete restriction.

8.7 Claim missing/duplicate evidence and submission error.

8.8 Validation review authorization or required reviewer note.

8.9 Strava permission, OAuth state, missing scope, reauthorization, sync busy/hourly limit/rate limit.

8.10 Race Result before Race Date or invalid status/time combination.

8.11 Program copy same-Race/ACTIVE destination/ownership restrictions.

8.12 Cancellation duplicate pending request, authorization, terminal state, and direct-cancel conflict.

Do not invent contact channels or production support procedures; these are **TO BE PROVIDED BY COPYRIGHT OWNER**.

## Chapter 9 — Technical Overview

9.1 Plain-language architecture diagram.

9.2 Next.js/React/TypeScript frontend and server layer.

9.3 Supabase PostgreSQL and Auth.

9.4 Role, ownership, RLS, constraint, and atomic-operation security model.

9.5 Strava data flow and boundary.

9.6 OpenNext/Cloudflare deployment configuration.

9.7 Data model overview and simplified ER diagram.

9.8 Privacy/sanitization and no-secret documentation policy.

## Chapter 10 — Closing

10.1 Summary of the implemented training lifecycle.

10.2 Responsible interpretation of descriptive evidence.

10.3 Version/document control and owner-provided support information.

## Appendices

A. Confirmed feature inventory.

B. Role and permission matrix.

C. Terminology glossary.

D. Application version/baseline record.

E. Milestone/development history.

F. Screenshot index and sanitization checklist.

G. Known limitations and deliberately out-of-scope analytics.

## Repository Evidence

- `docs/copyright/00-baseline-audit.md`
- `docs/copyright/02-feature-inventory.md`
- `docs/copyright/03-role-permission-matrix.md`
- `docs/copyright/04-route-inventory.md`
- `docs/copyright/05-user-workflows.md`
- `docs/copyright/06-technical-architecture.md`
- `docs/copyright/07-database-overview.md`
- `docs/copyright/08-integration-overview.md`
- `docs/copyright/09-screenshot-checklist.md`
