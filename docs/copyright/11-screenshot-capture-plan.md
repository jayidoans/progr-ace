# Phase 2A Screenshot Capture Plan

## Scope and Baseline

This is a planning document. No screenshot has been captured and no database record has been created. The protected baseline is:

- Git tag: `v1.0.0-copyright`
- Baseline commit: `962eb0fcab5ce793dfce1e26ed1d31c0f5052688`
- Application implementation baseline: `7b08de311f043b51551ec71e54ffba1028a54dc2`
- Product/version for the future manual: ProgrACE 1.0
- Manual language: Bahasa Indonesia, while actual English UI labels remain unchanged

## Pre-flight Findings

| Area | Finding | Consequence for Phase 2B |
|---|---|---|
| Workspace | `main` is clean and the tag resolves to the documentation commit. | Safe to plan against the frozen baseline. |
| Local app | `package.json` provides `npm run dev`, `npm run build`, and type/lint checks; Next.js requires the documented public Supabase/site variables. | Start the local app with a documentation-only environment file outside Git. |
| Local database | `supabase/config.toml`, ordered migrations, local seed, local Auth, local SMTP, and local Storage are present. Read-only `supabase status` reports local services stopped. | A local Supabase reset plus a documentation-only seed extension is the preferred Phase 2B route. No reset or seed change was run in Phase 2A. |
| Remote safety | The checkout has a linked Supabase project, but no remote operation was performed. Local/remote target must be rechecked immediately before Phase 2B. | Current status: `DATABASE SAFETY NOT CONFIRMED`; do not run reset/push/seed commands until the target is proven local. |
| Browser automation | No Playwright, Cypress, Puppeteer, or project E2E runner was found. | `AUTOMATION NOT CURRENTLY AVAILABLE`; use manual-local capture or add an isolated documentation runner only in a later approved phase. |
| Cloudflare/OpenNext | Worker configuration is present but not needed for local screenshots. | Do not use production Cloudflare as a screenshot source unless a manual-production figure is explicitly approved. |

The Supabase CLI is available through the project toolchain. Its read-only status check showed local services stopped; because the checkout also has a linked project, Phase 2B must perform a fresh local-target safety check before any `db reset` or seed operation. No database operation was run in Phase 2A.

## Recommended Capture Standard

- Primary viewport: **1440 × 1000 CSS pixels**.
- Browser zoom: 100%.
- Capture application viewport only; omit browser chrome unless a specific authentication/URL instruction requires it.
- PNG, one deterministic filename per planned figure.
- Use full UI clarity, no DevTools, terminal, password manager, notifications, bookmarks, loading skeletons, or unrelated tabs.
- Capture selected responsive figures additionally at 390 × 844 only where mobile layout materially teaches the workflow: A03, A10, C08, C09, C12, AD01.
- Do not multiply all 38 figures across viewports.

## Capture Method Definitions

- **AUTO-LOCAL:** existing browser automation can produce a deterministic local screenshot. None is currently available.
- **MANUAL-LOCAL:** a person captures the sanitized local application after local Auth/database setup.
- **MANUAL-PRODUCTION:** a person captures a controlled approved environment because a real provider connection or deployment state is required.
- **NOT-RECOMMENDED:** do not include in the final manual; retained only when the checklist is useful for audit traceability.

## Deterministic File Naming

```text
docs/copyright/screenshots/general/fig-01-01-landing.png
docs/copyright/screenshots/athlete/fig-04-01-race-goal.png
docs/copyright/screenshots/coach/fig-05-08-weekly-planner.png
docs/copyright/screenshots/admin/fig-06-01-user-directory.png
```

No directories or image files are created in Phase 2A.

## Capture Matrix — General

| ID | Chapter | Caption | Role | Route | Demo State / prerequisites | Capture Method | Priority |
|---|---|---|---|---|---|---|---|
| G01 | 2 | ProgrACE Landing Page | Public | `/` | Signed out; synthetic public page. No dialog/menu. | MANUAL-LOCAL | Medium |
| G02 | 3 | Login | Public | `/login` | Empty form; no password entered. No dialog/menu. | MANUAL-LOCAL | High |
| G03 | 3 | Registration | Public | `/register` | Empty form; no password entered. No dialog/menu. | MANUAL-LOCAL | High |
| G04 | 3 | Authenticated Dashboard Navigation | Multi-role demo | `/dashboard` | Local demo user signed in; Active Mode selector and grouped navigation visible. No dialog. | MANUAL-LOCAL | High |

## Capture Matrix — Athlete

| ID | Chapter | Caption | Role | Route | Demo State / prerequisites | Capture Method | Priority |
|---|---|---|---|---|---|---|---|
| A01 | 4.2 | Active Race Goal | Athlete | `/dashboard/race-goals` | ACTIVE goal before Race Date; target and notes visible. No dialog. | MANUAL-LOCAL | High |
| A02 | 4.3 | Personal Training Programs | Athlete | `/dashboard/training` | PUBLISHED and historical CANCELLED Programs visible to the signed-in Athlete. No dialog. | MANUAL-LOCAL | High |
| A03 | 4.3 | Published Weekly Schedule | Athlete | `/dashboard/training/[programId]` | PUBLISHED current week with sessions and rest/no-session days; current-week focus visible. No dialog. | MANUAL-LOCAL | High |
| A04 | 4.5 | Training Session and Claim Entry | Athlete | `/dashboard/training/prescriptions/[prescriptionId]/claim` | Published Prescription and eligible unclaimed Activities; form visible. No dialog. | MANUAL-LOCAL | High |
| A05 | 4.4 | Activities History | Athlete | `/dashboard/activities` | Synthetic MANUAL and STRAVA-labeled fixtures with filters. No dialog. | MANUAL-LOCAL | High |
| A06 | 4.4 | Activity Detail | Athlete | `/dashboard/activities/[id]` | Synthetic Activity with factual metrics, RPE/notes, and optional Claim use. No dialog. | MANUAL-LOCAL | Medium |
| A07 | 4.5 | Strava Connection | Athlete | `/dashboard/integrations/strava` | A real approved demo Strava connection only; permission, status, sync date visible. No OAuth dialog in final image. | MANUAL-PRODUCTION | High |
| A08 | 4.6 | Draft Claim Builder | Athlete | `/dashboard/claims/[claimId]` | DRAFT Claim with multiple selected Activities, note, and submit action. No dialog. | MANUAL-LOCAL | High |
| A09 | 4.7 | Athlete Training Evaluation | Athlete | `/dashboard` | Program with mixed factual states. No dialog; status counts visible. | MANUAL-LOCAL | High |
| A10 | 4.8 | Training Progress | Athlete | `/dashboard/training/[programId]/progress` | Published weeks, explicit planned distance, submitted running evidence, and trend selector. No dialog. | MANUAL-LOCAL | High |
| A11 | 4.9 | Race Result | Athlete | `/dashboard/race-goals` | Race Date passed; FINISHED result and derived difference visible. No dialog; edit disclosure may remain closed. | MANUAL-LOCAL | High |
| A12 | 4.10 | Request Program Cancellation | Athlete | `/dashboard/training/[programId]` | PUBLISHED Program; Request Cancellation disclosure/dialog intentionally open with synthetic reason. | MANUAL-LOCAL | High |
| A13 | 4.10 | Pending Cancellation State | Athlete | `/dashboard/training/[programId]` | PENDING request, Program still PUBLISHED. No dialog. | MANUAL-LOCAL | High |
| A14 | 4.10 | Cancelled Program and History | Athlete | `/dashboard/training/[programId]` | CANCELLED Program with audit/history and retained schedule context. No dialog. | MANUAL-LOCAL | High |

## Capture Matrix — Coach

| ID | Chapter | Caption | Role | Route | Demo State / prerequisites | Capture Method | Priority |
|---|---|---|---|---|---|---|---|
| C01 | 5.1 | Coach Dashboard | Coach | `/dashboard` | Owned Programs with mixed evaluation states. No dialog. | MANUAL-LOCAL | High |
| C02 | 5.2 | Coaching Athlete List | Coach | `/dashboard/coaching/athletes` | Two synthetic Athletes linked through Coach-owned Programs. No dialog. | MANUAL-LOCAL | High |
| C03 | 5.2 | Coach Athlete Detail | Coach | `/dashboard/coaching/athletes/[athleteId]` | Owned Athlete with goal, Program, counts, and attention items. No dialog. | MANUAL-LOCAL | High |
| C04 | 5.4 | Create Training Program | Coach | `/dashboard/training/new` | Eligible ACTIVE destination goal; form visible. No dialog. | MANUAL-LOCAL | High |
| C05 | 5.5 | XLSX Import Form | Coach | `/dashboard/training` | Import panel and template action visible; no real personal file. No dialog. | MANUAL-LOCAL | High |
| C06 | 5.5 | XLSX Import Preview | Coach | `/dashboard/training/import/[previewId]` | Valid local demo preview with weeks/sessions/warnings and Confirm action. No dialog. | MANUAL-LOCAL | High |
| C07 | 5.6 | Unplanned Week Entry | Coach | `/dashboard/training/[programId]` | Missing in-range week row; Not planned and Plan This Week/Add Another Week visible. No dialog. | MANUAL-LOCAL | High |
| C08 | 5.6 | Draft Weekly Planner | Coach | `/dashboard/training/[programId]` | DRAFT week with editable session/components and Publish Week. No modal; component editor open if it clarifies the UI. | MANUAL-LOCAL | High |
| C09 | 5.6 | Published Program and Week | Coach | `/dashboard/training/[programId]` | PUBLISHED Program/week; immutable schedule and current-week navigation. No dialog. | MANUAL-LOCAL | High |
| C10 | 5.8 | Validation Queue | Coach | `/dashboard/validation` | Owned NEEDS_REVIEW and resolved fixtures. No dialog. | MANUAL-LOCAL | High |
| C11 | 5.8 | Claim Validation Detail | Coach | `/dashboard/validation/[claimId]` | Submitted Claim with checks/evidence; review form visible. No dialog. | MANUAL-LOCAL | High |
| C12 | 5.9 | Athlete Training Progress | Coach | `/dashboard/training/[programId]/progress` | Coach-owned Program with multiple published weeks and trend data. Menu selector may show All Running. | MANUAL-LOCAL | High |
| C13 | 5.10 | Coach Race Result Management | Coach | `/dashboard/coaching/athletes/[athleteId]` | Race Date passed; authorized result form or existing result. No dialog. | MANUAL-LOCAL | High |
| C14 | 5.11 | Copy Training Program | Coach | `/dashboard/training/new` | Source owned Program and same-Race ACTIVE destination; copy form visible. No dialog. | MANUAL-LOCAL | High |
| C15 | 5.12 | Review Athlete Cancellation Request | Coach | `/dashboard/training/[programId]` | PENDING request; review reason and decision controls intentionally visible. No dialog unless confirmation is the subject. | MANUAL-LOCAL | High |
| C16 | 5.12 | Direct Cancellation and Draft Deletion | Coach | `/dashboard/training/[programId]` | Capture two clearly labeled local states: PUBLISHED direct-cancel confirmation and DRAFT deletion confirmation. Dialog open for each state. | MANUAL-LOCAL | High |
| C17 | 5.12 | Cancelled Program View | Coach | `/dashboard/training/[programId]` | CANCELLED owned Program with audit and historical schedule/progress. No dialog. | MANUAL-LOCAL | High |

## Capture Matrix — Admin

| ID | Chapter | Caption | Role | Route | Demo State / prerequisites | Capture Method | Priority |
|---|---|---|---|---|---|---|---|
| AD01 | 6.2 | Manage Users Summary and Directory | Admin | `/dashboard/admin/users` | Local synthetic accounts with role combinations and connected-state fixture; summary/search visible. No dialog. | MANUAL-LOCAL | High |
| AD02 | 6.3 | User Account and Password Assistance | Admin | `/dashboard/admin/users/[userId]` | Synthetic non-Admin target; password status and Reset Password action visible. Do not submit/reset for the screenshot. | MANUAL-LOCAL | High |
| AD03 | 6.5 | Admin Strava Access Management | Admin | `/dashboard/admin/users/[userId]` | Synthetic Athlete permission/connection state. No credentials or tokens; no dialog. | MANUAL-LOCAL | High |

## Original Checklist Review

All 38 figures are retained as **KEEP**. None is removed or silently dropped. C16 is a combined figure with two labeled local states because it explains two distinct lifecycle operations. A07 is **MANUAL-PRODUCTION** only if a controlled provider-connected demonstration account is approved; otherwise it should be omitted from the final manual rather than simulated.

## Phase 2B Prerequisites

1. Reconfirm `DATABASE SAFETY NOT CONFIRMED` is false by checking the active Supabase target is local.
2. Start local Supabase from the frozen checkout and apply migrations/reset only under the approved local workflow.
3. Extend local-only demo seed outside production with fictional Programs/states from `13-demo-data-specification.md`; do not change application migrations.
4. Create or use local Auth fixtures without documenting passwords. Keep any local credentials outside Git.
5. Start the app with local-only public Supabase/site variables.
6. Capture manual-local figures at 1440×1000 and selected mobile figures.
7. Decide separately whether a real Strava demo capture is safe and necessary.

## Manual Language Mapping

Use the same IDs in the future Indonesian manual: Chapter 4 uses A01–A14, Chapter 5 uses C01–C17, Chapter 6 uses AD01–AD03, and general setup uses G01–G04. Keep UI labels such as “Race Goal”, “Training Program”, “Request Cancellation”, “Published”, and “Cancelled” exactly as rendered.

## Repository Evidence

- `docs/copyright/09-screenshot-checklist.md`
- `docs/copyright/10-user-manual-source-outline.md`
- `docs/copyright/01-application-identity.md`
- `supabase/config.toml`
- `supabase/seed.sql`
- `package.json`
- `wrangler.jsonc`
- `open-next.config.ts`
- `app/`
