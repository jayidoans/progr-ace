# Screenshot Capture Checklist

## Capture Rules

- Every authenticated screenshot must display a visible **DEMO DATA ONLY** marker added to the capture environment or composition.
- Use purpose-built demonstration accounts, races, dates, Activities, and names. Never use production accounts or real Athlete data.
- Crop or mask email addresses, browser account avatars, provider identifiers, UUIDs, query-string identifiers, and unrelated browser tabs.
- Do not show passwords, temporary passwords, tokens, secrets, network inspectors, environment configuration, or provider dashboards.
- Normalize routes in captions. A screenshot may contain a local/demo ID in the address bar only if it is fully cropped or masked.
- Capture desktop and representative mobile views where a figure notes responsiveness.

## General — 4 Figures

### Figure G01 — ProgrACE Landing Page

- **Role:** Public
- **Route:** `/`
- **Required Application State:** Signed out; demonstration environment.
- **Required Visible Elements:** ProgrACE identity, primary purpose copy, Login and Register actions.
- **Purpose in Manual:** Introduces the application entry point.
- **Privacy/Sanitization Notes:** No personal data. Use **DEMO DATA ONLY** if any sample Program is visible.

### Figure G02 — Login

- **Role:** Public
- **Route:** `/login`
- **Required Application State:** Empty form.
- **Required Visible Elements:** Email and password fields, sign-in action, registration link.
- **Purpose in Manual:** Shows how users access an existing account.
- **Privacy/Sanitization Notes:** Never enter or display a real password/email; **DEMO DATA ONLY**.

### Figure G03 — Registration

- **Role:** Public
- **Route:** `/register`
- **Required Application State:** Empty form.
- **Required Visible Elements:** Name, email, password, confirmation, create-account action.
- **Purpose in Manual:** Shows account creation fields.
- **Privacy/Sanitization Notes:** Use synthetic identity only; **DEMO DATA ONLY**.

### Figure G04 — Authenticated Dashboard Navigation

- **Role:** Multi-role demo account
- **Route:** `/dashboard`
- **Required Application State:** Demo account with at least Athlete and Coach roles.
- **Required Visible Elements:** ProgrACE navigation, Active Mode selector, Dashboard, grouped Training/Coaching/Profile links, sign out.
- **Purpose in Manual:** Explains navigation and presentation modes.
- **Privacy/Sanitization Notes:** Mask email; emphasize that mode is not authorization; **DEMO DATA ONLY**.

## Athlete — 14 Figures

### Figure A01 — Active Race Goal

- **Role:** Athlete
- **Route:** `/dashboard/race-goals`
- **Required Application State:** One ACTIVE demo Race Goal before Race Date.
- **Required Visible Elements:** Race, date, distance, target finish time, update/cancel controls.
- **Purpose in Manual:** Demonstrates Athlete target management.
- **Privacy/Sanitization Notes:** Synthetic Race/target; **DEMO DATA ONLY**.

### Figure A02 — Personal Training Programs

- **Role:** Athlete
- **Route:** `/dashboard/training`
- **Required Application State:** At least one PUBLISHED and one historical CANCELLED demo Program visible to the Athlete.
- **Required Visible Elements:** Program name, status, Race context, date range.
- **Purpose in Manual:** Shows current and historical Program access.
- **Privacy/Sanitization Notes:** Synthetic Athlete/Race names; **DEMO DATA ONLY**.

### Figure A03 — Published Weekly Schedule

- **Role:** Athlete
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** PUBLISHED Program with current PUBLISHED week and mixed session/rest days.
- **Required Visible Elements:** Current-week accent, date range, session menus/titles, rest/no-session presentation, previous/next controls.
- **Purpose in Manual:** Explains assigned weekly training.
- **Privacy/Sanitization Notes:** Crop URL ID; **DEMO DATA ONLY**.

### Figure A04 — Training Session and Claim Entry

- **Role:** Athlete
- **Route:** `/dashboard/training/prescriptions/[prescriptionId]/claim`
- **Required Application State:** Actionable PUBLISHED Prescription and eligible unclaimed demo Activities.
- **Required Visible Elements:** Prescription target/components, Activity choices, Athlete note, create-Claim action.
- **Purpose in Manual:** Shows how evidence is associated with assigned training.
- **Privacy/Sanitization Notes:** Crop IDs; synthetic metrics; **DEMO DATA ONLY**.

### Figure A05 — Activities History

- **Role:** Athlete
- **Route:** `/dashboard/activities`
- **Required Application State:** Mix of MANUAL/STRAVA demo Activities and claim states.
- **Required Visible Elements:** Month navigation, filters, Activity cards/rows, add-manual and Strava entry points.
- **Purpose in Manual:** Demonstrates Activity records and history controls.
- **Privacy/Sanitization Notes:** No real route/location/provider IDs; **DEMO DATA ONLY**.

### Figure A06 — Activity Detail

- **Role:** Athlete
- **Route:** `/dashboard/activities/[id]`
- **Required Application State:** Demo Activity with distance/duration and RPE/notes; optionally linked to Claim.
- **Required Visible Elements:** Source/type, date, factual metrics, notes/RPE, training-session usage.
- **Purpose in Manual:** Explains factual Activity evidence.
- **Privacy/Sanitization Notes:** Crop URL ID; no raw provider payload; **DEMO DATA ONLY**.

### Figure A07 — Strava Connection

- **Role:** Athlete
- **Route:** `/dashboard/integrations/strava`
- **Required Application State:** Admin permission Allowed and demo connection active.
- **Required Visible Elements:** Permission, connection/sync status, last sync, sync and disconnect actions.
- **Purpose in Manual:** Shows supported Strava lifecycle.
- **Privacy/Sanitization Notes:** Mask Strava display/athlete identifier; never show credentials; **DEMO DATA ONLY**.

### Figure A08 — Draft Claim Builder

- **Role:** Athlete
- **Route:** `/dashboard/claims/[claimId]`
- **Required Application State:** DRAFT Claim with at least two selected demo Activities.
- **Required Visible Elements:** Prescription, ordered components, selected evidence, add/remove evidence, note, submit/delete actions.
- **Purpose in Manual:** Demonstrates multi-Activity Claim preparation.
- **Privacy/Sanitization Notes:** Crop ID; synthetic data; **DEMO DATA ONLY**.

### Figure A09 — Athlete Training Evaluation

- **Role:** Athlete
- **Route:** `/dashboard`
- **Required Application State:** Published Program containing VERIFIED, PARTIAL, MISSED, and UPCOMING examples.
- **Required Visible Elements:** Race/program context, current week, factual status counts, recent validation/attention.
- **Purpose in Manual:** Explains operational evaluation without a score.
- **Privacy/Sanitization Notes:** Synthetic counts; do not imply medical/performance judgment; **DEMO DATA ONLY**.

### Figure A10 — Training Progress

- **Role:** Athlete
- **Route:** `/dashboard/training/[programId]/progress`
- **Required Application State:** PUBLISHED demo weeks with explicit planned distance and submitted running evidence.
- **Required Visible Elements:** Program context, factual summary, weekly planned/completed distance, current week, outcomes, trend filter.
- **Purpose in Manual:** Shows longitudinal running history.
- **Privacy/Sanitization Notes:** Crop Program ID; synthetic metrics; **DEMO DATA ONLY**.

### Figure A11 — Race Result

- **Role:** Athlete
- **Route:** `/dashboard/race-goals`
- **Required Application State:** Race Date passed; FINISHED demo result and target difference visible.
- **Required Visible Elements:** Race Day, target, actual, status, factual difference, edit control.
- **Purpose in Manual:** Explains Race Goal versus actual Race Result.
- **Privacy/Sanitization Notes:** Synthetic Race/result; **DEMO DATA ONLY**.

### Figure A12 — Request Program Cancellation

- **Role:** Athlete
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** Own PUBLISHED Program with no pending request.
- **Required Visible Elements:** Cancellation request disclosure/dialog, reason field, confirmation copy.
- **Purpose in Manual:** Documents Athlete-initiated cancellation.
- **Privacy/Sanitization Notes:** Use a fictional reason without health/private details; **DEMO DATA ONLY**.

### Figure A13 — Pending Cancellation State

- **Role:** Athlete
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** PENDING request; Program still PUBLISHED.
- **Required Visible Elements:** Waiting-for-review status, submitted reason/date, continued Program status.
- **Purpose in Manual:** Clarifies that a request does not immediately cancel the Program.
- **Privacy/Sanitization Notes:** Synthetic reason; **DEMO DATA ONLY**.

### Figure A14 — Cancelled Program and History

- **Role:** Athlete
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** CANCELLED Program with approved request/history.
- **Required Visible Elements:** Cancelled status, effective time/reason/history, preserved schedule/evaluation context, no new actionable training.
- **Purpose in Manual:** Demonstrates preserved history and terminal status.
- **Privacy/Sanitization Notes:** Synthetic reviewer/reason; crop ID; **DEMO DATA ONLY**.

## Coach — 17 Figures

### Figure C01 — Coach Dashboard

- **Role:** Coach
- **Route:** `/dashboard`
- **Required Application State:** Multiple owned demo Programs with mixed outcomes.
- **Required Visible Elements:** Program/Athlete summaries, needs-review and missed lists.
- **Purpose in Manual:** Introduces the Coach operational workspace.
- **Privacy/Sanitization Notes:** Synthetic Athletes; **DEMO DATA ONLY**.

### Figure C02 — Coaching Athlete List

- **Role:** Coach
- **Route:** `/dashboard/coaching/athletes`
- **Required Application State:** At least two Athletes linked through Coach-owned Programs.
- **Required Visible Elements:** Athlete, Race, Program/week context, outcome counts, View action.
- **Purpose in Manual:** Shows scope-limited Athlete management.
- **Privacy/Sanitization Notes:** Synthetic names; **DEMO DATA ONLY**.

### Figure C03 — Coach Athlete Detail

- **Role:** Coach
- **Route:** `/dashboard/coaching/athletes/[athleteId]`
- **Required Application State:** Owned Athlete with ACTIVE goal and current Program.
- **Required Visible Elements:** Goal/Race context, Program, status counts, attention items, Program/Progress links.
- **Purpose in Manual:** Shows Athlete-centered coaching context.
- **Privacy/Sanitization Notes:** Crop ID; synthetic personal data; **DEMO DATA ONLY**.

### Figure C04 — Create Training Program

- **Role:** Coach
- **Route:** `/dashboard/training/new`
- **Required Application State:** Eligible ACTIVE destination Race Goal.
- **Required Visible Elements:** Goal selector, name, description, start date, create action.
- **Purpose in Manual:** Documents manual Program setup.
- **Privacy/Sanitization Notes:** Synthetic Athlete/Race; **DEMO DATA ONLY**.

### Figure C05 — XLSX Import Form

- **Role:** Coach
- **Route:** `/dashboard/training`
- **Required Application State:** Eligible Race Goal; no confidential workbook selected.
- **Required Visible Elements:** Template download, import Program context, file picker/upload guidance.
- **Purpose in Manual:** Introduces full-plan import.
- **Privacy/Sanitization Notes:** Use sanitized template filename; **DEMO DATA ONLY**.

### Figure C06 — XLSX Import Preview

- **Role:** Coach
- **Route:** `/dashboard/training/import/[previewId]`
- **Required Application State:** Valid parsed demo workbook with warnings where useful.
- **Required Visible Elements:** Program summary, weeks/sessions/components preview, warnings, confirm action.
- **Purpose in Manual:** Shows review before atomic import.
- **Privacy/Sanitization Notes:** Crop ID/file path; synthetic content; **DEMO DATA ONLY**.

### Figure C07 — Unplanned Week Entry

- **Role:** Coach
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** PUBLISHED Program with an in-range missing week row.
- **Required Visible Elements:** Not planned state and Plan This Week/Add Another Week action.
- **Purpose in Manual:** Distinguishes UNPLANNED from Rest.
- **Privacy/Sanitization Notes:** Crop ID; **DEMO DATA ONLY**.

### Figure C08 — Draft Weekly Planner

- **Role:** Coach
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** DRAFT week with one editable session and multiple components.
- **Required Visible Elements:** Draft status, session fields, component editor, add/edit/delete actions, Publish Week.
- **Purpose in Manual:** Demonstrates progressive weekly planning.
- **Privacy/Sanitization Notes:** Synthetic workout; capture mobile and desktop variants; **DEMO DATA ONLY**.

### Figure C09 — Published Program and Week

- **Role:** Coach
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** PUBLISHED Program/week.
- **Required Visible Elements:** Published badges, immutable schedule, current-week navigation, Training Progress link.
- **Purpose in Manual:** Shows final assigned weekly plan.
- **Privacy/Sanitization Notes:** Synthetic Athlete; **DEMO DATA ONLY**.

### Figure C10 — Validation Queue

- **Role:** Coach
- **Route:** `/dashboard/validation`
- **Required Application State:** At least one NEEDS_REVIEW and one resolved demo validation in owned scope.
- **Required Visible Elements:** Needs review and Resolved sections, Athlete/session/date/result.
- **Purpose in Manual:** Explains Coach review workload.
- **Privacy/Sanitization Notes:** Synthetic Athletes/Activities; **DEMO DATA ONLY**.

### Figure C11 — Claim Validation Detail

- **Role:** Coach
- **Route:** `/dashboard/validation/[claimId]`
- **Required Application State:** Submitted demo Claim with checks and evidence.
- **Required Visible Elements:** Prescription target, submitted evidence, automatic checks, decision controls, reviewer note.
- **Purpose in Manual:** Shows factual review and decision workflow.
- **Privacy/Sanitization Notes:** Crop ID; no raw Strava payload; **DEMO DATA ONLY**.

### Figure C12 — Athlete Training Progress

- **Role:** Coach
- **Route:** `/dashboard/training/[programId]/progress`
- **Required Application State:** Coach-owned Program with multiple published weeks.
- **Required Visible Elements:** Athlete/Program/Race context, weekly distance, outcomes, menu filter, multi-Activity indicator.
- **Purpose in Manual:** Shows evidence-based longitudinal review.
- **Privacy/Sanitization Notes:** Synthetic data; **DEMO DATA ONLY**.

### Figure C13 — Coach Race Result Management

- **Role:** Coach
- **Route:** `/dashboard/coaching/athletes/[athleteId]`
- **Required Application State:** Owned Athlete, Race Date passed, result eligible or recorded.
- **Required Visible Elements:** FINISHED/DNF/DNS form or existing result, target/actual/difference.
- **Purpose in Manual:** Documents authorized Race Day result recording.
- **Privacy/Sanitization Notes:** Crop ID; synthetic Race/outcome; **DEMO DATA ONLY**.

### Figure C14 — Copy Training Program

- **Role:** Coach
- **Route:** `/dashboard/training/new`
- **Required Application State:** Owned source Program and eligible same-Race ACTIVE destination goal.
- **Required Visible Elements:** Source summary, destination selector, copy action, restriction guidance.
- **Purpose in Manual:** Shows schedule reuse into a new DRAFT.
- **Privacy/Sanitization Notes:** Synthetic source/destination Athletes; **DEMO DATA ONLY**.

### Figure C15 — Review Athlete Cancellation Request

- **Role:** Coach
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** PENDING Athlete request on Coach-owned PUBLISHED Program.
- **Required Visible Elements:** Athlete reason, approve/decline controls, optional review reason, preservation copy.
- **Purpose in Manual:** Documents review workflow.
- **Privacy/Sanitization Notes:** Fictional non-sensitive reason; **DEMO DATA ONLY**.

### Figure C16 — Direct Cancellation and Draft Deletion

- **Role:** Coach
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** Capture two sanitized panels/states: PUBLISHED without pending request, and DRAFT Program.
- **Required Visible Elements:** Direct cancellation reason/confirmation; separate permanent DRAFT deletion confirmation.
- **Purpose in Manual:** Contrasts cancellation with deletion.
- **Privacy/Sanitization Notes:** May be a two-part figure; **DEMO DATA ONLY**.

### Figure C17 — Cancelled Program View

- **Role:** Coach
- **Route:** `/dashboard/training/[programId]`
- **Required Application State:** CANCELLED owned Program with preserved historical schedule/claims.
- **Required Visible Elements:** Terminal status, cancellation audit, evaluation boundary notice, historical schedule/progress access.
- **Purpose in Manual:** Shows that cancellation preserves history and stops future assignment semantics.
- **Privacy/Sanitization Notes:** Synthetic reason/history; **DEMO DATA ONLY**.

## Admin — 3 Figures

### Figure AD01 — Manage Users Summary and Directory

- **Role:** Admin
- **Route:** `/dashboard/admin/users`
- **Required Application State:** Sanitized demo accounts including multi-role and connected Athlete examples.
- **Required Visible Elements:** Accounts/Athletes/Coaches/Strava summary, search, role badges, orange connected-Athlete presentation.
- **Purpose in Manual:** Documents supported user-directory administration.
- **Privacy/Sanitization Notes:** Synthetic names/emails only; no production totals; **DEMO DATA ONLY**.

### Figure AD02 — User Account and Password Assistance

- **Role:** Admin
- **Route:** `/dashboard/admin/users/[userId]`
- **Required Application State:** Demo non-Admin target user.
- **Required Visible Elements:** Account identity, actual roles, password status, Reset Password action.
- **Purpose in Manual:** Shows controlled account recovery support.
- **Privacy/Sanitization Notes:** Never capture generated temporary password; crop ID; mask email; **DEMO DATA ONLY**.

### Figure AD03 — Admin Strava Access Management

- **Role:** Admin
- **Route:** `/dashboard/admin/users/[userId]`
- **Required Application State:** Demo ATHLETE with representative permission/connection state.
- **Required Visible Elements:** Allowed/not allowed, connected/not connected, allow/revoke/disconnect actions and retention explanation.
- **Purpose in Manual:** Explains permission versus connection administration.
- **Privacy/Sanitization Notes:** Mask Strava identity; no credentials/tokens; **DEMO DATA ONLY**.

## Screenshot Count

| Group | Recommended figures |
|---|---:|
| General | 4 |
| Athlete | 14 |
| Coach | 17 |
| Admin | 3 |
| **Total** | **38** |

## Repository Evidence

- `app/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/dashboard/`
- `src/features/navigation/`
- `src/features/*/components/`
- `src/features/training-cancellation/components/program-cancellation-experience.tsx`
