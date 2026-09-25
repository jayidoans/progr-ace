# User-Accessible Route Inventory

Dynamic identifiers are normalized; no production IDs are included.

## Public and Authentication

| Route | Role | Purpose | Main Actions | Screenshot Needed |
|---|---|---|---|---|
| `/` | Public/authenticated | Product landing and a bounded list of available published Programs for authorized signed-in users | Login, register, open Program | Yes |
| `/login` | Public | Account sign-in | Sign in, go to registration | Yes |
| `/register` | Public | Account registration | Create account, go to login | Yes |
| `/auth/callback` | Public callback | Completes supported Supabase Auth callback flow | Redirect after verification | No |
| `/account/change-password` | Authenticated, including forced-change session | Changes current user's password | Submit new/confirmed password | Yes |
| `/calendar` | Public | Placeholder only; not the authenticated schedule | Navigation only | No — Historical/Legacy |
| `/program` | Public | Placeholder only; not the authenticated Program feature | Navigation only | No — Historical/Legacy |

## Shared Authenticated

| Route | Role | Purpose | Main Actions | Screenshot Needed |
|---|---|---|---|---|
| `/dashboard` | Athlete or Coach/Admin presentation | Operational evaluation dashboard for the resolved mode | Open current work/attention items | Yes |
| `/dashboard/profile` | All authenticated | View/update profile and access password change | Edit profile; Change Password | Yes |
| `/dashboard/training` | Athlete/Coach/Admin | List visible Programs; Coach/Admin also create/import and see active goals | Open Program, create, download template, import | Yes |
| `/dashboard/training/[programId]` | Authorized Program users | Program context, evaluation, schedule, planning/cancellation actions according to authority | View, claim, plan, publish, cancel, delete DRAFT | Yes |
| `/dashboard/training/[programId]/progress` | Authorized Athlete/Coach/Admin | Longitudinal running progress for one Program | Filter running trend; return to Program | Yes |
| `/dashboard/activities` | Athlete | Activity history and connection summary | Filter, add manual Activity, open Strava | Yes |
| `/dashboard/activities/new` | Athlete | Create manual Activity | Save Activity | Yes |
| `/dashboard/activities/[id]` | Authorized Activity owner/reviewer path | Activity detail and claim usage | Edit contextual data, open Claim, delete eligible manual Activity | Yes |
| `/dashboard/activities/[id]/edit` | Athlete owner | Edit eligible manual Activity | Save changes | No, can be combined with Activity figure |
| `/dashboard/claims/[claimId]` | Authorized Claim user/reviewer | Claim detail, evidence, note, submission state | Add/remove evidence, submit/delete DRAFT | Yes |

## Athlete

| Route | Role | Purpose | Main Actions | Screenshot Needed |
|---|---|---|---|---|
| `/dashboard/race-goals` | Athlete; Coach/Admin may access their own account context | Active goal, history, and Race Result | Set/update/cancel goal; record/edit eligible result | Yes |
| `/dashboard/training/prescriptions/[prescriptionId]/claim` | Athlete assigned to published Prescription | Start Claim with eligible Activities | Select evidence, note, create DRAFT | Yes |
| `/dashboard/integrations/strava` | Actual Athlete with presentation entry | Permission, connection, and synchronization status | Connect/reconnect, sync, disconnect | Yes |

## Coach and Admin Coaching Context

| Route | Role | Purpose | Main Actions | Screenshot Needed |
|---|---|---|---|---|
| `/dashboard/coaching/athletes` | Coach/Admin | Lists Athletes within authoritative coaching scope and factual progress summaries | Open Athlete detail | Yes |
| `/dashboard/coaching/athletes/[athleteId]` | Authorized Coach/Admin | Athlete goals, Programs, evaluation attention, Race Result, and Race Goal completion | Open Program/progress/review; record result; complete eligible goal | Yes |
| `/dashboard/training/new` | Coach/Admin | Create a Program or copy an existing eligible Program | Create/copy DRAFT Program | Yes |
| `/dashboard/training/import/[previewId]` | Importing Coach/Admin | Review parsed XLSX before confirmation | Confirm import | Yes |
| `/dashboard/training/template` | Coach/Admin | Downloads the current XLSX template | Download file | No standalone page |
| `/dashboard/validation` | Coach/Admin | Authorized validation queue | Open unresolved/resolved review | Yes |
| `/dashboard/validation/[claimId]` | Authorized Coach/Admin | Review submitted evidence and validation checks | Save Coach decision/note | Yes |

## Admin

| Route | Role | Purpose | Main Actions | Screenshot Needed |
|---|---|---|---|---|
| `/dashboard/admin/users` | Actual Admin | User directory, search, role/Strava summary | Search, open user | Yes |
| `/dashboard/admin/users/[userId]` | Actual Admin | Account, roles, password status, and Strava administration | Reset password; allow/revoke/disconnect Strava | Yes |

## External Integration Endpoints

| Route | Role | Purpose | Main Actions | Screenshot Needed |
|---|---|---|---|---|
| `/api/strava/connect` | Permitted Athlete | Begins Strava OAuth with protected state | Redirect to provider | No |
| `/api/strava/callback` | OAuth callback | Validates state and completes connection | Redirect to integration page | No |

## Route Verification Notes

- Authenticated routes inherit session and forced-password-change enforcement from `app/dashboard/layout.tsx` and `src/features/auth/session.ts`.
- Some shared routes render different actions by actual authorization. The route's existence does not grant access to unrelated records.
- Authorization failures commonly resolve as redirect or not-found behavior to avoid leaking unrelated Athlete/Program existence.
- Exact production-domain routing is **REQUIRES MANUAL VERIFICATION**; this inventory documents application-relative paths only.

## Repository Evidence

- `app/**/page.tsx`
- `app/**/route.ts`
- `app/dashboard/layout.tsx`
- `src/features/navigation/items.ts`
- `src/features/auth/session.ts`
- `src/features/training/queries.ts`
- `src/features/running-analytics/queries.ts`
