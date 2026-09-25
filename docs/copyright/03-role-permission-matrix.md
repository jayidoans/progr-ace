# Role and Permission Matrix

One account may hold multiple actual database roles. Active Mode controls navigation/presentation only; every authoritative operation still evaluates authenticated identity, actual roles, ownership, RLS, constraints, or a secure RPC.

Legend: **Own** means Athlete-owned data; **Owned scope** means a Program created by that Coach; **Broad** means the existing Admin scope, not unrestricted credential access.

| Capability | Athlete | Coach | Admin | Enforcement |
|---|---|---|---|---|
| Register/login/logout | Yes | Yes | Yes | Supabase Auth, server session checks |
| View/update profile | Own | Own | Own; directory view of others | RLS, server queries, Admin RPC |
| Change own password | Yes | Yes | Yes | Authenticated Supabase Auth update |
| Reset another user's password | No | No | Yes; not self through Admin path | Server-only Admin check, privileged server client, forced-change flag |
| View Race records | Yes | Yes | Yes | Authenticated select policy |
| Create shared Race | No | Yes | Yes | Server role check and insert policy |
| Create/update own Race Goal | Yes | No for another Athlete | No general mutation path; broader supported actions only | RLS/RPC |
| Cancel own active Race Goal | Yes | No | No dedicated Admin cancellation UI found | RLS, history trigger |
| Complete Race Goal | No | On/after Race Date in owned scope | Yes, appropriate broad scope | `complete_coached_race_goal`, role/ownership/date checks |
| View Training Program | Own PUBLISHED/CANCELLED | Owned Programs | Broad supported scope | RLS and server authorization |
| Create Training Program | No | For eligible ACTIVE goals | Yes | UI/server action, active-goal DB trigger, RLS |
| Import XLSX Program | No | Owned author workflow | Yes | Server parsing, preview RLS, confirm RPC |
| Add/edit full DRAFT schedule | No | Owned DRAFT Program | Yes | RLS, constraints, server actions |
| Start progressive week | No | Owned PUBLISHED Program | Yes | Planner RPC, actual role/ownership/status/date checks |
| Edit/delete DRAFT weekly session | No | Owned DRAFT week | Yes | Atomic planner RPCs |
| Publish week | No | Owned non-empty DRAFT week | Yes | Atomic RPC and constraints |
| Edit published week | No | No | No through weekly planner | DB/RPC lifecycle guards |
| Copy Training Program | No | Source owned by Coach; destination ACTIVE/same Race | Yes | `copy_training_program` RPC |
| Request Program cancellation | Own PUBLISHED Program | No | No | `request_training_program_cancellation`; Athlete ownership |
| Review cancellation request | No | Owned PUBLISHED Program | Yes | `review_training_program_cancellation` |
| Directly cancel Program | No | Owned PUBLISHED Program | Yes | `cancel_training_program`; no pending request |
| Delete DRAFT Program | No | Owned DRAFT Program | Yes | Dedicated `delete_draft_training_program` RPC |
| View Activities | Own | Only evidence needed for authorized review | Authorized review/admin paths where provided | RLS and review policies |
| Create manual Activity | Own | Only if account also has actual Athlete authority for own data | Only if actual Athlete-owned flow applies | RLS requires own manual provenance |
| Connect/sync Strava | Own when actual Athlete and Admin permission allows | Not by Coach role alone | Admin manages permission, not user OAuth identity | Permission RPC, OAuth state, server modules, RLS |
| Create/edit Claim draft | Own, published actionable Prescription | No | No separate Admin Claim-authoring path | Claim RPC/RLS/publication guard |
| Submit Claim | Own DRAFT Claim | No | No separate Admin submit path | Atomic RPC and immutability triggers |
| Validate submitted Claim | No | Owned Program scope | Yes | Review RPC, role and ownership checks |
| View operational evaluation | Own | Owned scope | Broad supported scope | Bounded server queries, RLS, claim-state RPC |
| View Training Progress | Own PUBLISHED/CANCELLED Program | Owned PUBLISHED/CANCELLED/ARCHIVED Program | Broad supported scope | M13 authorization helper plus RLS |
| Record/edit Race Result | Own eligible Race Goal | Relevant Program ownership | Broad supported scope | Race Result RPC, role/ownership/date/constraint checks |
| View Coach Athlete directory | No in Athlete mode | Athletes linked through owned Programs | Broader existing scope | M12 queries, RLS, actual role checks |
| View Admin user directory | No | No | Yes | Admin-only RPC and page checks |
| Manage Strava permission for users | No | No | Yes | Admin-only SECURITY DEFINER RPCs |
| Mutate roles / create/delete users / impersonate | No | No | Not implemented | No supported UI/operation |

## Important Enforcement Notes

1. **UI visibility is not the security boundary.** Sensitive mutations use RLS, database constraints/triggers, or narrow RPCs that re-check the authenticated caller.
2. **Coach role alone is insufficient.** Athlete-specific Coach access generally requires `training_programs.created_by = auth.uid()` for the relevant Program/goal.
3. **Admin authority is operation-specific.** The implementation checks the actual `ADMIN` role; it does not expose a generic superuser interface.
4. **Multi-role accounts are additive.** For example, an ATHLETE+COACH account may use Coach capability only when the Coach ownership rule also passes.
5. **Active Mode is not authorization.** It may hide/show navigation but cannot grant a database operation.
6. **Service credentials remain server-side.** The Admin password-reset flow is the only audited user-assistance path requiring a privileged Auth operation; credentials are not sent to the browser.

## Other Meaningful Roles

No additional application role beyond ATHLETE, COACH, and ADMIN was found. Statuses such as DRAFT, PUBLISHED, CANCELLED, ARCHIVED, FINISHED, DNF, and DNS are lifecycle states, not roles.

## Repository Evidence

- `src/features/auth/session.ts`
- `src/features/navigation/active-mode.ts`
- `src/features/navigation/items.ts`
- `src/features/training/queries.ts`
- `src/features/running-analytics/authorization.ts`
- `src/features/admin/queries.ts`
- `src/features/*/actions.ts`
- `supabase/migrations/20260914140000_secure_application_foundation.sql`
- `supabase/migrations/20260915100000_implement_training_prescription_foundation.sql`
- `supabase/migrations/20260915120000_implement_training_claims.sql`
- `supabase/migrations/20260915130000_implement_training_validation.sql`
- `supabase/migrations/20260922110000_secure_admin_user_directory.sql`
- `supabase/migrations/20260922120000_admin_strava_access.sql`
- `supabase/migrations/20260923120000_coach_weekly_training_planner.sql`
- `supabase/migrations/20260923130000_coach_athlete_progress_race_completion.sql`
- `supabase/migrations/20260923140000_race_result_foundation.sql`
- `supabase/migrations/20260923150000_training_program_copy.sql`
- `supabase/migrations/20260924100000_training_program_cancellation_foundation.sql`
