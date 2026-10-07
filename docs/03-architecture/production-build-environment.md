# Production build environment

ProgrACE runs on Next.js → OpenNext → Cloudflare Workers. Local `.env.local` deliberately points to local Supabase. Never use it as the source of a production build: Next.js embeds `NEXT_PUBLIC_*` values during `next build`, and Cloudflare Dashboard runtime variables cannot replace values already compiled into the browser/server bundle. This caused the October 2026 login outage; rollback restored production without changing accounts or passwords.

## Variable ownership

| Variable | Build | Browser | Server/runtime use | Secret? |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required, embedded | Supabase client | Compiled into server/middleware; Dashboard value also used by scheduled push dispatcher | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required, embedded | Supabase client | Compiled into Supabase server/middleware client | No |
| `NEXT_PUBLIC_SITE_URL` | Required, embedded | No current direct use | Compiled into server auth redirects and Strava callback | No |
| `SUPABASE_SECRET_KEY` | Cleared during build | Never | Admin client and push dispatcher | **Yes** |
| `VAPID_PUBLIC_KEY` | Cleared during build | Returned to authenticated browser via server action | Push delivery | No, but runtime-only |
| `VAPID_PRIVATE_KEY` | Cleared during build | Never | Push delivery | **Yes** |
| `VAPID_SUBJECT` | Cleared during build | Never | Push delivery | No, runtime-only |
| `STRAVA_CLIENT_ID` | Cleared during build | Never | Strava OAuth | No, runtime-only |
| `STRAVA_CLIENT_SECRET`, `STRAVA_TOKEN_ENCRYPTION_KEY` | Cleared during build | Never | Strava OAuth | **Yes** |

The build script clears known runtime-only variables in its child process so values from `.env.local` cannot enter the production build. Cloudflare Dashboard still supplies runtime values and secrets; `wrangler.jsonc` retains `keep_vars: true`. Never commit real secret values or put server-only values behind a `NEXT_PUBLIC_` name.

## Local development

Keep `.env.local` configured for local Supabase and run `npm run dev`. Production build validation is not applied to the development server. Do not overwrite or rename `.env.local` for a release.

## Production build and release

1. Create ignored `.env.production.local` containing **only** these three public build values, or export them explicitly in the build shell:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PRODUCTION-PUBLISHABLE-KEY
   NEXT_PUBLIC_SITE_URL=https://progr-ace.idoans.app
   ```

   These are public configuration values, not service-role or VAPID private keys. The production file is git-ignored. Do not include any other variables in it. If values exist both in the shell and file, shell values win.

2. Confirm the matching production runtime variables and server-only secrets are configured in Cloudflare Dashboard. The build script cannot read Dashboard values; they do not replace build-time public values.
3. Run `npm run build:cloudflare:production`. The Next.js build phase fails before packaging if the wrapper was bypassed, a required public value is missing, the URL is local or non-HTTPS, or the selected publishable key matches `.env.local`.
4. Inspect the generated bundle/manifest and run `npx wrangler deploy --dry-run` if desired. For a real release, run **`npm run deploy:production`**, which rebuilds through the same guard before deploying. Do not use raw `npx @opennextjs/cloudflare deploy` against an old, unverified bundle.
5. After authorized deployment, smoke-test login for Athlete, Coach, and Admin; then verify Notification Center, push subscription, scheduled push, Strava OAuth, and logout on one of two subscribed devices.

`npm run build:production` produces a guarded Next.js build without OpenNext. `npm run build:cloudflare:production` produces the deployable OpenNext bundle. `npm run deploy` and `npm run upload` are aliases of the guarded production paths. A plain `npm run build` or raw OpenNext build without the wrapper intentionally fails in the production build phase; `npm run dev` remains unchanged.

The M17.2 database migrations are separate from this build procedure. This hotfix requires no schema/RLS changes and does not redeploy or migrate production.
