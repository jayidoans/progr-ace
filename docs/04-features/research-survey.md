# ProgrACE Research Survey

`/survey` is a fixed 19-item research instrument for authenticated users with the actual `ATHLETE` role. It stores one final response per Athlete for `PROGRACE_RESEARCH_2026_V1`.

## Data and scoring

The response contains SUS01–SUS10, TM01–TM03, EV01–EV03, AC01–AC03, consent metadata, and server-calculated scores. SUS uses the standard alternating-polarity calculation and is stored on a 0–100 scale; TM, EV, and AC are independent means on a 1–5 scale.

Missing answers and missing consent are rejected before the RPC is called. The database repeats all validation and calculates scores itself; client values are never accepted as scores.

## Access and finality

The migration `20261015100000_research_survey.sql` enables and forces RLS. Athletes can only read their own response to determine completed state. They receive no INSERT, UPDATE, or DELETE policy. `submit_research_survey_response` verifies authentication and the `ATHLETE` role, then relies on a unique `(athlete_user_id, survey_version)` constraint to make concurrent duplicate submissions fail safely.

## Research export

An actual `ADMIN` may download `/api/admin/research-survey.csv`, also linked from Admin → Manage Users. The route calls the security-definer `export_research_survey_responses` RPC, which enforces `ADMIN` server-side. The CSV contains a deterministic pseudonymous participant identifier, response data, version, timestamp, and calculated scores. It excludes names, emails, account IDs, and credentials.

## Deployment and verification

Apply the migration through the normal Supabase production migration workflow before deploying the application code. Do not apply it manually in the production SQL editor. Locally:

```sh
npx supabase db push --local
npx supabase test db supabase/tests/database/research_survey.test.sql
node --import tsx --test src/features/research-survey/domain.test.ts
```

Manual browser checks should cover the mobile radio controls, all 19 required answers, missing consent, completed state after refresh, non-Athlete access, and the Admin CSV download.
