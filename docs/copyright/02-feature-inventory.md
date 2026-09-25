# Current Feature Inventory

Status vocabulary: **Implemented** means repository code and enforcement exist; **Technical only** means an internal capability without a dedicated user-facing screen; **Historical/Legacy** means code remains but is not the current product workflow; **Not Implemented** is stated only where useful to prevent overclaiming.

## Account & Authentication

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Register and sign in | Public | Creates/signs into a Supabase Auth account with validated input. | Yes | `app/register`, `app/login`, `src/features/auth/actions.ts` | Implemented |
| Sign out and session protection | Authenticated | Protects dashboard routes and redirects unauthenticated users. | Yes | `app/dashboard/layout.tsx`, `src/features/auth/session.ts` | Implemented |
| Profile display/name update | All authenticated | Shows account identity and supports profile-name maintenance. | Yes | `app/dashboard/profile`, `src/features/profiles/` | Implemented |
| Change own password | All authenticated | Authenticated password update with confirmation and safe feedback. | Yes | `app/account/change-password`, `src/features/auth/password-actions.ts` | Implemented |
| Forced password change | All authenticated | Restricts ordinary dashboard access until a required password change succeeds. | Yes | `src/features/auth/password-enforcement.ts`, account migration | Implemented |
| Admin temporary-password reset | Admin | Server-only privileged reset; generated password is shown once and forces change. | Yes | `src/features/admin/reset-password-form.tsx`, `src/features/auth/admin-password-reset-core.ts` | Implemented |

## Dashboard

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Athlete operational dashboard | Athlete | Active goal, current program/week, outcome counts, recent validation, and attention context. | Yes | `app/dashboard/page.tsx`, Athlete evaluation component | Implemented |
| Coach operational dashboard | Coach/Admin | Owned Athlete/Program summaries, review attention, and missed sessions. | Yes | `src/features/evaluation/components/coach-evaluation-dashboard.tsx` | Implemented |
| Active Mode navigation | Multi-role accounts | Selects Athlete/Coach/Admin presentation context only. | Yes | `src/features/navigation/active-mode.ts`, `items.ts` | Implemented |

## Race Goals

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Browse shared Races | Authenticated | Lists Race records available for goals. | Yes | `app/dashboard/race-goals`, Race Goal queries | Implemented |
| Add shared Race | Coach/Admin | Adds Race name, date, location, and distance. | Yes | `createRace`, Race RLS/policies | Implemented |
| Set/update active Race Goal | Athlete | Stores Race, target finish time, and optional notes. | Yes | Race Goal form/actions and RPC | Implemented |
| Cancel active Race Goal | Athlete | Moves own ACTIVE goal to CANCELLED and preserves history. | Yes | `closeRaceGoal`, M12 policies | Implemented |
| Complete Race Goal | Authorized Coach/Admin | Completion on/after Race Date; Athlete cannot self-complete. | Yes | Coach Athlete detail, `complete_coached_race_goal` | Implemented |
| Goal history | Athlete/authorized Coach/Admin | Shows COMPLETED/CANCELLED historical goals within scope. | Yes | `race-goal-history.tsx`, M12 queries | Implemented |

## Training Programs and XLSX Import

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Create DRAFT Program | Coach/Admin | Creates a Program for an ACTIVE Race Goal; end date is the Race Date. | Yes | `/dashboard/training/new`, `createTrainingProgram` | Implemented |
| Legacy/manual full-draft builder | Coach/Admin | Adds weeks, prescriptions, and components while Program is DRAFT. | Yes | Program detail DRAFT forms | Implemented |
| Publish full Program | Coach/Admin | DRAFT to PUBLISHED and publishes imported/existing weeks together. | Yes | `publishTrainingProgram`, lifecycle trigger | Implemented |
| Download XLSX template | Coach/Admin | Supplies the accepted full-plan workbook template. | Yes | `/dashboard/training/template`, import template module | Implemented |
| Upload, preview, confirm XLSX | Coach/Admin | Validates workbook limits/content, shows preview, then atomically imports. | Yes | import page/actions/parser; import migrations | Implemented |
| Import safety and idempotency | Internal | Size/uncompressed-row limits, workbook validation, source hash, and confirm RPC. | No dedicated screen | `training-import/security.ts`, import tests/migrations | Implemented |
| Public `/program` placeholder | Public | Static placeholder, not the authenticated Program feature. | Yes, but non-functional | `app/program/page.tsx` | Historical/Legacy |

## Weekly Training Planning and Prescriptions

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Calendar lifecycle | Authorized Coach/Admin, Athlete read | Missing row = UNPLANNED; rows are DRAFT or PUBLISHED. | Yes | M11 migrations, Training Schedule components | Implemented |
| Plan an unplanned week | Program owner Coach/Admin | Intentionally creates one DRAFT week; viewing alone creates none. | Yes | weekly planner actions/RPC | Implemented |
| Create/edit/delete DRAFT session | Program owner Coach/Admin | Manages Prescription fields and components atomically while DRAFT. | Yes | weekly planner, M11.2 RPCs | Implemented |
| Publish non-empty week | Program owner Coach/Admin | Atomic DRAFT to PUBLISHED transition. | Yes | `publish_training_week` | Implemented |
| Published-week immutability | All | Planner cannot edit/unpublish published content. | User-visible restriction | M11.2 RPC guards/UI | Implemented |
| Extend progressive plan to Race Day | Program owner Coach/Admin | Adds the next valid DRAFT week without exceeding Race Date. | Yes | progressive extension RPC/migration | Implemented |
| Multiple sessions per day | Coach/Admin | Supported; stable ordering is preserved. | Yes | schema and planner | Implemented |
| Training Menu taxonomy | Coach/Admin | EASY, MEDIUM, LONG, SPEED, STRENGTH. INTERVAL is a Workout Type, not a Menu. | Yes | `training-import/template.ts` | Implemented |
| Explicit REST Prescription | — | REST is absence of a Prescription in a published plan. | No | domain implementation | Not Implemented by design |
| Public `/calendar` placeholder | Public | Static placeholder, not the authenticated schedule. | Yes, but non-functional | `app/calendar/page.tsx` | Historical/Legacy |

## Training Activities and Strava

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Manual Activity CRUD | Athlete | Records factual sport Activity and permits edits/deletion when not locked by submitted evidence. | Yes | Activity routes/actions and RLS | Implemented |
| Activity history/filtering | Athlete | Calendar-month history with type/claim context and details. | Yes | Activity list/history components | Implemented |
| Strava permission administration | Admin | Allows/revokes eligible Athlete access and can disconnect a connection. | Yes | Admin user detail, Phase 2 migration | Implemented |
| Strava OAuth connection | Permitted Athlete | Connect/reconnect/disconnect through OAuth. | Yes | integration page, API routes, Strava modules | Implemented |
| Synchronize recent Activities | Connected Athlete | Imports supported factual Activity fields with rate/concurrency protection. | Yes | `syncStravaActivities`, M8 migrations/tests | Implemented |
| Edit Strava notes/RPE context | Athlete | Updates ProgrACE-owned contextual fields, not provider metrics. | Yes | Activity detail/context RPC | Implemented |
| Preserve imported Activity on disconnect | Athlete/Admin | Disconnect removes connection credentials but retains Activity history. | User-visible copy | disconnect lifecycle | Implemented |
| Infer Race Result from Strava | — | No automatic Race Result inference exists. | No | Race Result/Strava separation | Not Implemented |

## Activity Claims and Validation

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Create/edit/delete Claim draft | Athlete | Creates one Claim for an actionable published Prescription and manages note/evidence. | Yes | Claim builder/actions, M5 migration | Implemented |
| Multiple-Activity evidence | Athlete | Associates one or more eligible Activities with one Prescription. | Yes | `claim_activities`, Claim UI | Implemented |
| Submit Claim | Athlete | Moves DRAFT to SUBMITTED and locks submitted content. | Yes | `submit_training_claim` | Implemented |
| Automatic Validation | Internal + visible result | Creates factual checks/results from submitted evidence. | Result visible | M6 migration, validation engine | Implemented |
| Coach review | Program owner Coach/Admin | Reviews authorized Claim with VERIFIED, PARTIAL, or REJECTED decision; notes required for specified outcomes. | Yes | Validation routes/action/RPC | Implemented |
| NEEDS_REVIEW state | Coach/Athlete | Identifies automatic cases that require Coach judgment. | Yes | validation result model | Implemented |

## Training Evaluation and Progress

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Operational session states | Authorized users | UPCOMING, NOT_CLAIMED, DRAFT, SUBMITTED, VERIFIED, PARTIAL, NEEDS_REVIEW, REJECTED, MISSED. | Yes | compliance engine and dashboards | Implemented |
| Program evaluation overview | Authorized users | Factual state counts plus needs-review and missed items. | Yes | Program evaluation components | Implemented |
| Tracking adoption boundary | Internal + behavioral | Avoids false MISSED before `tracking_start_date`. | Behavior visible | M11.3 migration/evaluation helper | Implemented |
| Cancellation boundary | Internal + behavioral | Stops expected-training consequences on cancellation effective date. | Behavior visible | M15 migration/evaluation helper | Implemented |
| Running Progress page | Athlete/owner Coach/Admin | Program context, factual summary, weekly planned/completed distance, outcomes, and trends. | Yes | `/progress`, running analytics modules | Implemented |
| Conservative evidence calculations | Authorized users | Submitted Claims in PUBLISHED weeks; explicit prescribed distance; unique RUNNING Activities; no fabricated HR/RPE. | Yes | running analytics domain/tests | Implemented |
| Proprietary readiness/compliance score | — | No new overall score exists. | No | M10/M13 implementation | Not Implemented |

## Race Results

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Record/edit Race Result | Athlete/authorized Coach/Admin | Manual FINISHED, DNF, or DNS after Race Date. | Yes | Race Goal and Coach Athlete views, Race Result RPCs | Implemented |
| Target-versus-actual difference | Authorized users | Derived seconds for FINISHED with a target; no qualitative score. | Yes | Race Result domain/presentation | Implemented |
| Independent Race Goal lifecycle | All | Recording/editing result does not complete or change Race Goal. | Behavioral | Race Result migration/tests | Implemented |

## Program Copy and Cancellation

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| Copy Program | Owner Coach/Admin | Copies schedule to an ACTIVE destination goal for the same Race; creates DRAFT. | Yes | new Program page, copy RPC | Implemented |
| Athlete cancellation request | Athlete | Requests cancellation of own PUBLISHED Program with reason; one pending at a time. | Yes | cancellation experience/RPC | Implemented |
| Review request | Owner Coach/Admin | Approves or declines PENDING request; approval cancels Program. | Yes | cancellation component/RPC | Implemented |
| Direct cancellation | Owner Coach/Admin | Cancels PUBLISHED Program with reason if no request is pending. | Yes | cancellation component/RPC | Implemented |
| Delete DRAFT Program | Owner Coach/Admin | Permanently deletes a DRAFT Program through dedicated operation. | Yes | cancellation component/RPC | Implemented |
| Cancellation history | Authorized Program users | Shows request/review/cancellation reasons and timestamps. | Yes | Program page/query | Implemented |

## Administration

| Feature | Role | Description | User Visible | Evidence | Status |
|---|---|---|---|---|---|
| User directory and search | Admin | Lists registered users, email/name, and actual roles via narrow Admin RPC. | Yes | Admin routes, `admin_list_users` | Implemented |
| User summary | Admin | Accounts, Athletes, Coaches, and connected Athlete count without N+1 status queries. | Yes | Admin summary modules | Implemented |
| User detail | Admin | Account, roles, password status, and Strava access/connection state. | Yes | Admin user detail | Implemented |
| Role mutation/user deletion/impersonation | — | No interface or supported operation found. | No | Admin implementation | Not Implemented |

## Repository Evidence

- `app/`
- `src/features/auth/`
- `src/features/race-goals/`
- `src/features/training/`
- `src/features/training-import/`
- `src/features/activities/`
- `src/features/strava/`
- `src/features/claims/`
- `src/features/validation/`
- `src/features/evaluation/`
- `src/features/running-analytics/`
- `src/features/race-results/`
- `src/features/training-cancellation/`
- `src/features/admin/`
- `supabase/migrations/`
