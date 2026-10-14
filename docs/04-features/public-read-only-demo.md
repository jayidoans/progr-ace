# Public read-only demonstration environment

## Objective

The public demonstration environment supports publication review without exposing production data or allowing visitors to change the synthetic training domain. It is a separate deployment, not a presentation mode inside production.

Planned public entry:

- title: `Progr-ACE DEMO PAGE`;
- research title: `ProgrACE: Evidence-Based Training Management for Athlete–Coach Collaboration`;
- Athlete display name: `Atlit Strava`;
- Coach display name: `Kuch`;
- Program: `Marathon Training`;
- Race: `The International Marathon`;
- reference date: `2027-01-08`;
- Race date: `2027-03-14`;
- content language: English.

The source workbook contains 17 weeks and 68 sessions. The demo seed will shift its schedule deterministically to the requested Race date in the database-hardening and seed batch. The source workbook is not modified or committed.

## Batch 1 environment foundation

Batch 1 establishes deployment isolation and presentation capabilities:

- Worker: `progr-ace-demo`;
- hostname: `demo.progr-ace.idoans.app`;
- dedicated Supabase project and publishable key;
- no Cron trigger or scheduled push dispatcher;
- no Strava, Web Push, registration, password-management, or Admin management surface;
- a persistent `Demo · Read only · Synthetic data` authenticated-shell banner;
- no account email, UUID, or Notification Center mutation in the demo shell;
- fixed reference-date configuration required at build and runtime.

This batch does not create users, seed records, add automatic demo login, or claim complete domain write protection. Do not deploy the public demo until the later database write guard and read-only domain UX batches pass.

## Local configuration

Create ignored `.env.demo.local` with only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-DEMO-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-DEMO-PUBLISHABLE-KEY
NEXT_PUBLIC_SITE_URL=https://demo.progr-ace.idoans.app
PROGRACE_DEMO_REFERENCE_DATE=2027-01-08
```

Do not put a Supabase secret key, database password, Strava credential, VAPID key, or demo account password in this file. The build parser rejects those names. A complete `.env.production.local` is required so the demo guard can reject the production Supabase URL and publishable key.

## Build and deployment commands

```bash
npm run build:demo
npm run build:cloudflare:demo
npm run deploy:demo
```

The demo OpenNext commands explicitly use `wrangler.demo.jsonc`. The default and production scripts continue to use `wrangler.jsonc`. The demo deployment command must not be run until database and UI read-only enforcement are complete.

The Wrangler demo configuration declares the Custom Domain. Cloudflare creates the DNS record and certificate during an authorized deployment. Do not add a self-referencing CNAME manually.

## Integration boundaries

The demo Worker does not contain a scheduled handler. The demo application hides and rejects registration, password-management, Push subscription, and Strava operations. Normal sign-out remains available without querying or revoking a Push subscription.

PWA installation and online-first behavior remain available. Authenticated demo data is not added to the service-worker cache.

## Batch 2 database hardening and synthetic seed

Batch 2 adds a demo-only database overlay under `supabase/demo/`. It is not a
production migration. The overlay must be applied only after the normal schema
has been replayed into the dedicated demo project.

The overlay provides three independent protections:

1. `demo_read_only_users` is private to trusted maintenance code.
2. row-level write guards cover all 24 mutable public tables. Because these are
   table triggers, they also reject writes made through existing
   `SECURITY DEFINER` domain RPCs when the authenticated actor is a demo user.
3. Auth triggers prevent password, email, phone, user-metadata, and MFA changes
   for the shared accounts while allowing routine sign-in metadata updates.

Normal application RLS remains authoritative for reads. The overlay does not
grant broader access and does not alter production policies, functions, or
tables.

The provisioner reads the approved ProgrACE workbook directly, validates it
with the production import parser, and shifts every date by exactly 98 days so
the final Marathon session is `2027-03-14`. It creates:

- `Atlit Strava` with only the ATHLETE role;
- `Kuch` with only the COACH role;
- `The International Marathon`, 42.195 km, target finish 05:30:00;
- `Marathon Training`, 17 published weeks and 68 prescriptions;
- deterministic VERIFIED, PARTIAL, over-target, REJECTED, MISSED,
  NEEDS REVIEW, and UPCOMING examples;
- synthetic Activities, Claims, automatic validation detail, and completed-week
  Coach reviews.

The reference date precedes Race Day, so Batch 2 deliberately does not create a
Race Result. This preserves the truthful pre-race state requested for the demo.
No Strava connection, Push subscription, real Athlete data, or production data
is created.

### Demo seed environment

Create an ignored `.env.demo.seed.local`. Do not reuse production credentials.

```dotenv
PROGRACE_DEMO_SUPABASE_URL=https://YOUR-DEMO-PROJECT.supabase.co
PROGRACE_DEMO_SUPABASE_SECRET_KEY=YOUR-DEMO-SECRET-KEY
PROGRACE_DEMO_PROJECT_REF=YOUR-DEMO-PROJECT
PROGRACE_DEMO_ATHLETE_EMAIL=athlete-demo@your-domain.example
PROGRACE_DEMO_ATHLETE_PASSWORD=GENERATE-A-UNIQUE-20+-CHARACTER-PASSWORD
PROGRACE_DEMO_COACH_EMAIL=coach-demo@your-domain.example
PROGRACE_DEMO_COACH_PASSWORD=GENERATE-A-DIFFERENT-20+-CHARACTER-PASSWORD
PROGRACE_DEMO_TRAINING_WORKBOOK=/absolute/path/to/approved-training-plan.xlsx
PROGRACE_DEMO_REFERENCE_DATE=2027-01-08
PROGRACE_DEMO_RACE_DATE=2027-03-14
```

The explicit project ref must match the Supabase URL. The provisioner also
compares the target with `.env.production.local` and refuses the production
project. Secrets and passwords are never printed. Its only success output is a
privacy-safe aggregate summary.

### Safe provisioning order

1. Create a fresh, dedicated Supabase project for the demo.
2. Replay all normal migrations into that project using the approved Supabase
   deployment workflow.
3. Apply `supabase/demo/0001_read_only_hardening.sql` in the demo project SQL
   editor. Do not add it to `supabase/migrations/`.
4. Prepare `.env.demo.seed.local` and run `npm run provision:demo` locally.
5. Run `npm run smoke:demo:read-only` before the public Worker is deployed. The
   script signs in as both shared accounts, verifies their isolated role and
   profile reads, proves that the private registry cannot be read, and requires
   a harmless same-value profile update to fail with SQLSTATE `42501`.
6. Remove the local seed file when credentials are moved into the approved
   secret store for Batch 3.

The provisioner restores the read-only registry in a `finally` boundary even
when data insertion fails. Re-running is safe for stable fixture identifiers;
existing rows are not overwritten. Rotate shared passwords only through an
explicit maintenance procedure that temporarily removes the registry entry and
restores it immediately afterward.

### Local verification

```bash
npm run test:demo
npm run test:demo:db
```

The database test verifies authorized reads, direct write denial, mutating RPC
denial, private registry access, password protection, MFA protection, and that
unrelated non-demo accounts retain their normal behavior.

## Batch 3 public entry and read-only domain UX

The public root page offers explicit `Explore as Athlete` and `Explore as Coach`
actions. Account credentials are read only by the server action and must never
be placed in `.env.demo.local`, client JavaScript, HTML, or public Worker vars.
Configure the four runtime-only values as secrets on `progr-ace-demo` before the
release batch:

```bash
npx wrangler secret put PROGRACE_DEMO_ATHLETE_EMAIL --config wrangler.demo.jsonc
npx wrangler secret put PROGRACE_DEMO_ATHLETE_PASSWORD --config wrangler.demo.jsonc
npx wrangler secret put PROGRACE_DEMO_COACH_EMAIL --config wrangler.demo.jsonc
npx wrangler secret put PROGRACE_DEMO_COACH_PASSWORD --config wrangler.demo.jsonc
```

These commands are release preparation and must not be run against the
production Worker. The demo build explicitly scrubs the values from its build
environment so they remain runtime-only.

Public entry is limited by the `DEMO_LOGIN_RATE_LIMITER` Cloudflare binding (10
attempts per hashed client-address key per 60 seconds). It fails closed if the
binding or credentials are missing. The raw client address is neither logged
nor used as a persistent browser fingerprint.

The application provides three read-only layers:

1. domain mutation controls and mutation-only pages are unavailable in demo UI;
2. server actions fail closed before authentication/database mutation work;
3. the demo-only database triggers remain the final authorization boundary.

Read-only schedules, Evaluation, Training Insights, Race Result display, and
Coach PDF export remain available. Notifications are readable but cannot be
marked read. Presentation-only choices such as theme may remain device-local.
Registration, password management, Admin, Strava, and Push remain unavailable.

The Activities page includes a clearly labelled `Sync from Strava (Demo)`
control. It is a client-only simulation: it shows a bounded sync-attempt state
and completion message, but never starts OAuth, calls Strava, changes a token,
or writes a database row. The seed marks a deterministic subset of synthetic
Activities as `STRAVA` with synthetic external IDs. Those records remain
read-only, just like real imported Strava Activities in the production app.

Date-sensitive demo queries use `PROGRACE_DEMO_REFERENCE_DATE=2027-01-08`, so
the shared experience remains stable instead of changing with wall-clock time.
The normal production deployment continues to use the real current date.

### Remote database smoke verification

Keep `.env.demo.local` limited to public build values and keep shared account
credentials in the ignored `.env.demo.seed.local`. Then run:

```bash
npm run smoke:demo:read-only
```

Expected output contains only a privacy-safe aggregate event with two accounts,
successful authorized reads, private registry protection, and rejected domain
mutations. It never prints emails, passwords, user IDs, project secrets, or raw
rows. A failed check exits non-zero and must block release.

## Remaining release batch

### Release verification

- build and dry-run the demo configuration;
- verify the generated bundle targets only demo Supabase;
- deploy only `progr-ace-demo`;
- smoke-test both roles and direct mutation denial;
- confirm the production Worker and production database are unchanged.
