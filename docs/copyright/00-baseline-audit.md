# ProgrACE v1.0 Copyright Baseline Audit

Audit date: 25 September 2026 (Asia/Jakarta)

This document records the repository state proposed as the factual source for the ProgrACE software copyright documentation. It does not create a release, deployment, or Git tag.

## Repository State

| Item | Evidence-based value |
|---|---|
| Branch | `main` |
| HEAD | `7b08de311f043b51551ec71e54ffba1028a54dc2` |
| HEAD message | `feat: add training program cancellation experience` |
| Upstream | `origin/main`; synchronized when the audit began |
| Working tree at audit start | Clean |
| Package version indicator | `0.1.0` in `package.json` |
| Candidate documentation name | ProgrACE v1.0 — Copyright Registration Baseline |

The package version is a development metadata value and does not itself establish the legal or public product version. The official version remains **TO BE PROVIDED BY COPYRIGHT OWNER**.

### Relevant Recent Milestone Commits

| Commit | Repository evidence |
|---|---|
| `7b08de3` | Training Program cancellation experience (M15.2) |
| `93dd89c` | Training Program cancellation foundation (M15.1) |
| `5b2c5f8` | Restored Training Program copy workflow (M14.3) |
| `bcf977e` | Form guidance and input safety improvements |
| `fa01900` | Training Program performance hardening |
| `0ed1d16` | Progressive planning extension to Race Day |
| `8d6f9cd` | XLSX workbook XML compatibility fix |
| `5103b92` / `96fa689` | Race Result experience and foundation |
| `dfeca1d` / `defb845` | Running Progress experience and analytics foundation |
| `fd3cd6b` | Coach Athlete progress and Race Goal completion |
| `42fe1e5` / `b767396` | Weekly planner and weekly planning foundation |

## Milestone and Module Coverage

| Module | Status | Confirmation |
|---|---|---|
| Authentication and account access | Implemented | Registration, login, logout, profile, password change, forced-password-change handling, and Admin temporary-password reset are present. |
| Race Goals | Implemented | ACTIVE, COMPLETED, and CANCELLED lifecycle; Athlete management of own active goal; Coach/Admin completion rules. |
| Training Programs | Implemented | DRAFT, PUBLISHED, CANCELLED, and ARCHIVED status model; Race Goal and Race Date linkage. |
| Complete-plan XLSX import | Implemented | Downloadable template, secure parsing, preview, confirmation, idempotency, and import limits are implemented. |
| Progressive weekly planning | Implemented | Missing week means UNPLANNED; existing week is DRAFT or PUBLISHED; Coach/Admin planner supports session and component editing before publication. |
| Training Prescriptions and components | Implemented | Menu, date, title, description, ordered components, distance/duration/repetition/pace/recovery fields. |
| Manual Activities | Implemented | Athlete-owned create, read, update, and delete with claim-aware restrictions. |
| Strava integration | Implemented | Admin permission gate, OAuth connection, bounded synchronization, disconnect, and retained imported Activity history. Live provider configuration requires manual verification. |
| Activity Claims | Implemented | DRAFT/SUBMITTED claims, multiple Activity evidence, submission, and immutability enforcement. |
| Claim Validation | Implemented | Automatic validation plus authorized Coach/Admin review outcomes. |
| Training Evaluation | Implemented | Existing compliance states and attention summaries; no proprietary overall score. |
| Training Progress / Running Analytics | Implemented | Program-scoped weekly volume, outcomes, running trends, and conservative multi-Activity handling. |
| Race Results | Implemented | FINISHED, DNF, DNS; manual create/update; Race Date and authorization constraints. |
| Training Program copy | Implemented | Coach/Admin copy to an eligible active Race Goal for the same Race, producing a new DRAFT Program. |
| Training Program cancellation foundation | Implemented | Cancellation audit fields, request entity, terminal lifecycle protection, and authorized RPC operations. |
| Athlete cancellation request | Implemented | Athlete may request cancellation of own PUBLISHED Program and provide a reason. |
| Coach/Admin cancellation review | Implemented | Authorized owner Coach/Admin may approve or decline a pending request. |
| Direct Coach/Admin cancellation | Implemented | Authorized owner Coach/Admin may cancel eligible PUBLISHED Program when no request is pending. |
| Draft Program deletion | Implemented | Dedicated authorized operation; distinct from cancellation. |
| Administration | Partially Implemented by design | User directory, summary, account/password assistance, and Strava access management exist. User creation/deletion, role mutation, banning, and impersonation are not implemented. |
| Public `/calendar` and `/program` pages | Historical/Legacy | Current files contain placeholder copy and are not the authenticated Training Schedule implementation. |
| Advanced physiological analytics or AI coaching | Not Found | No VO2Max, readiness, HR-zone inference, prediction, ranking, or AI recommendation system was found. |

## Lifecycle Boundaries Confirmed

- Lower evaluation boundary: `training_programs.tracking_start_date`. A past prescription before that boundary without a claim is represented as not claimed rather than falsely counted as MISSED.
- Upper evaluation boundary: the UTC date portion of `training_programs.cancelled_at`. Expected training uses an exclusive upper bound: `scheduled_date < cancellation effective date`.
- Together, the intended factual window is conceptually `tracking_start_date <= scheduled_date < cancellation_effective_date` for expected training. Submitted historical evidence may remain visible according to the specialized analytics logic.
- Cancellation does not delete Training Weeks, Prescriptions, Activities, Claims, Validations, or historical progress data.

## Candidate v1.0 Assessment

The repository contains a coherent implemented path from account access through Race Goal, Training Program planning/import, Activity evidence, Claim, Validation, Evaluation, Training Progress, Race Result, Program copy, and Program cancellation. M15 is present at both database and user-experience layers. The implementation is therefore suitable as a **candidate** ProgrACE v1.0 copyright documentation baseline, subject to the manual verification items below and an explicit version-freeze decision by the copyright owner.

### REQUIRES MANUAL VERIFICATION

- Official copyright holder, creators, institution, first publication date, and registration identity.
- Official public version number, because `package.json` still reports `0.1.0`.
- Live production availability and environment configuration for Supabase, Cloudflare, and Strava.
- End-to-end visual capture using sanitized demonstration accounts and data.
- Whether legacy public placeholder routes should remain visible in the future release; they are excluded from the active feature claims in this audit.

No `v1.0.0-copyright` tag was created.

## Repository Evidence

- `AGENTS.md`
- `package.json`
- `app/`
- `src/features/`
- `src/types/database.ts`
- `supabase/migrations/`
- `docs/04-features/`
- Git history through `7b08de311f043b51551ec71e54ffba1028a54dc2`
