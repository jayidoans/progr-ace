# ProgrACE Development Instructions

## Product

ProgrACE is a training prescription, activity evidence,
validation, and evaluation platform for RIOT running athletes.

The primary business domain is:

Athlete
→ Race Goal
→ Training Program
→ Training Prescription
→ Activity Evidence
→ Claim
→ Validation
→ Evaluation

Strava is an external activity evidence provider.
Strava must not own the training domain.

## Technology Stack

- Next.js App Router
- TypeScript
- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Tailwind CSS
- shadcn/ui
- Zod
- React Hook Form

## Architecture Rules

1. Use Server Components by default.
2. Use Client Components only when browser interaction is required.
3. Keep business logic outside UI components.
4. Organize code by feature/domain.
5. Database schema changes must use Supabase migrations.
6. Never create production database tables manually from application code.
7. Do not expose service-role keys to the browser.
8. Do not expose Strava access or refresh tokens to the browser.
9. All user-owned database tables must use RLS.
10. Do not modify unrelated features unless explicitly requested.

## Domain Rules

Training Prescription is different from Activity.

A Prescription represents what the athlete should perform.

An Activity represents evidence of what the athlete actually performed.

A Training Claim associates one or more Activities
with a Training Prescription.

Initial claim statuses:

- PENDING
- CLAIMED
- VERIFIED
- PARTIAL
- REJECTED
- MISSED

## Development Workflow

Before implementing a feature:

1. Read relevant files in /docs.
2. Explain the proposed implementation.
3. Identify affected database tables.
4. Identify required RLS policies.
5. Implement only the requested scope.
6. Run lint and type checks.
7. Report changed files.