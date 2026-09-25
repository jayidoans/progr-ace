# ProgrACE Application Identity

## Identity Sheet

| Field | Confirmed information |
|---|---|
| Application name | ProgrACE |
| Application type | Role-based web application for running training planning, evidence, review, and longitudinal progress |
| Primary purpose | Connect an Athlete's Race Goal to a structured Training Program, factual Activity evidence, Claim validation, evaluation, and Race Day outcome |
| Intended users | Running Athletes, Coaches, and Administrators |
| Main application roles | ATHLETE, COACH, ADMIN; one account may hold multiple roles |
| Platform | Responsive browser-based application |
| Frontend/runtime | Next.js App Router, React, TypeScript, Tailwind CSS |
| Server model | Next.js server components, server actions, route handlers, and server-only feature queries |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | Database roles, ownership checks, Row Level Security, database constraints, and narrow RPC operations |
| External user-facing integration | Strava OAuth and Activity synchronization, subject to Admin permission |
| Deployment model | OpenNext-built application configured for Cloudflare Workers and Cloudflare assets |
| Copyright documentation baseline | `v1.0.0-copyright` at commit `962eb0fcab5ce793dfce1e26ed1d31c0f5052688` |
| Application implementation baseline | Milestone 15 implementation at commit `7b08de311f043b51551ec71e54ffba1028a54dc2` |
| Copyright year | 2026 |
| Creator | Jay Idoan Sihotang |
| Copyright holder | Jay Idoan Sihotang |
| Institution | Fakultas Teknologi Informasi Universitas Advent Indonesia |
| Official website | https://progr-ace.idoans.app |

## Product Description

ProgrACE separates the planned training assignment from evidence of completed training. A Coach prepares a Training Program and its Training Prescriptions. An Athlete records or synchronizes Activities, associates one or more Activities with a Prescription through a Claim, and submits the Claim. Validation and evaluation then use the submitted evidence. Training Progress provides factual program-level running history, while Race Result records the Race Day outcome separately from the Race Goal.

## Role Summary

- **Athlete:** manages their Race Goal, views assigned published training, maintains Activities, submits Claims, views evaluation/progress, records an eligible Race Result, and may request cancellation of their published Program.
- **Coach:** creates and imports Programs, plans/publishes weeks, reviews Claims, views owned Athletes' progress, completes eligible Race Goals, manages Race Results within ownership scope, copies Programs, and manages Program cancellation.
- **Admin:** has broader application authority for the supported management operations, including user directory/password assistance and Strava access controls. Admin is not a separate superuser role outside the actual `ADMIN` role.

Active Mode changes presentation/navigation for multi-role users but is not an authorization source.

## Legal and Publication Identity

| Required copyright information | Value |
|---|---|
| Official copyright holder | Jay Idoan Sihotang |
| Creator/developer names | Jay Idoan Sihotang |
| Legal institution/organization | Fakultas Teknologi Informasi Universitas Advent Indonesia |
| Official version number | 1.0 |
| Copyright baseline tag | `v1.0.0-copyright` |
| Copyright baseline commit | `962eb0fcab5ce793dfce1e26ed1d31c0f5052688` |
| Copyright year | 2026 |
| First publication date | **TO BE PROVIDED BY COPYRIGHT OWNER** |
| First publication place | **TO BE PROVIDED BY COPYRIGHT OWNER** |
| Copyright registration identity | **TO BE PROVIDED BY COPYRIGHT OWNER** |
| Official product website | https://progr-ace.idoans.app |

## Classification Notes

- Supabase and Cloudflare are infrastructure platforms, not training-domain owners.
- Strava supplies external Activity evidence; ProgrACE retains the training plan, Claim, Validation, Evaluation, and Race Result domain rules.
- The repository does not support claims that ProgrACE is AI-powered or produces physiological predictions.

## Repository Evidence

- `AGENTS.md`
- `package.json`
- `app/layout.tsx`
- `app/dashboard/layout.tsx`
- `src/features/navigation/`
- `src/features/auth/`
- `src/lib/supabase/`
- `wrangler.jsonc`
- `open-next.config.ts`
