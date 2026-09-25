# Confirmed User Workflows

These workflows describe current repository behavior. Terms such as RPC, RLS, and database trigger are internal controls; users interact with forms, buttons, and status displays.

## Workflow A — Account Access

1. A user opens Registration, supplies name, email, password, and confirmation.
2. Supabase Auth creates the account. A profile and role assignment are established through the configured account foundation.
3. The user signs in and enters the authenticated dashboard.
4. A multi-role user may choose an Active Mode for navigation; actual roles remain the authorization source.
5. The user can update the profile name and change their password.
6. If Admin assistance set a temporary password, ordinary dashboard access redirects to Change Password until the user successfully changes it.

Operational email-confirmation behavior depends on the configured Supabase environment and is **REQUIRES MANUAL VERIFICATION**.

## Workflow B — Race Goal

1. The Athlete opens Race Goals and chooses an existing Race.
2. The Athlete enters a target finish time and optional notes.
3. ProgrACE creates/switches the Athlete's single active goal while preserving historical goals.
4. The Athlete may update or cancel the active goal; cancellation preserves it in history.
5. The Athlete cannot mark the goal COMPLETED.
6. On or after Race Date, an authorized owner Coach or Admin may mark an ACTIVE goal COMPLETED. This does not assert perfect training compliance or target achievement.

Coach/Admin can add shared Race records; Athletes cannot.

## Workflow C — Training Program Creation

### Manual path

1. Coach/Admin selects an eligible ACTIVE Race Goal.
2. The user provides Program name, optional description, and start date.
3. A DRAFT Program is created; its end date is the linked Race Date.
4. In the full-draft builder, the author can add weeks, Prescriptions, and ordered components.
5. Publishing the Program makes its imported/existing schedule available according to the publication rules.

### XLSX path

1. Coach/Admin downloads the ProgrACE XLSX template.
2. The user completes the workbook and uploads it with Program context.
3. The server validates file/envelope limits and parses the accepted template structure.
4. ProgrACE stores an authorized, expiring preview and displays warnings/content for review.
5. Confirming invokes an atomic import. The imported Program is then opened.
6. Repeated upload/confirmation is guarded by source hashing and import idempotency.

The full-program import remains distinct from progressive weekly planning.

## Workflow D — Weekly Planning

The weekly lifecycle is:

```text
missing week row (UNPLANNED)
          │ Plan This Week
          ▼
       DRAFT week
          │ add/edit/delete sessions and components
          │ Publish Week (requires at least one session)
          ▼
     PUBLISHED week
```

- **UNPLANNED:** no Training Week row exists. Viewing/navigating does not create one. It is not a Rest Week and produces no MISSED consequence.
- **DRAFT:** the Coach is preparing content. The Athlete cannot treat it as assigned/actionable training.
- **PUBLISHED:** its Prescriptions are athlete-visible/actionable; existing Claim, Validation, MISSED, and analytics rules apply.

An authorized Coach/Admin starts a week only inside the Program date range. Prescription dates must belong to that week and cannot exceed Program/Race boundaries. Published weeks are not edited or unpublished through this planner. The Program may be extended by valid weekly planning up to, but never beyond, Race Date.

## Workflow E — Training Execution and Activity

1. The Athlete views a PUBLISHED Prescription.
2. The Athlete performs the training outside ProgrACE.
3. Evidence enters ProgrACE as a manually recorded Activity or a synchronized Strava Activity.
4. Prescription and Activity remain separate entities; an Activity does not become Program evidence until attached through a submitted Claim.

## Workflow F — Strava

1. Admin allows Strava connection for an account that has the actual ATHLETE role.
2. The Athlete opens the Strava integration page and begins OAuth connection.
3. ProgrACE validates a single-use state and stores the resulting provider credentials encrypted on the server/database side.
4. The Athlete requests synchronization of recent Activities. Concurrency and hourly limits are applied.
5. Imported Activities appear in Activity history. The Athlete may add ProgrACE-owned notes/RPE context without changing provider facts.
6. Disconnect removes the connection but retains imported Activities and downstream history. Admin permission remains a separate state and can later be revoked.

No Strava Activity automatically becomes a Claim or Race Result.

## Workflow G — Activity Claim

1. The Athlete opens an actionable Prescription from a PUBLISHED week.
2. The Athlete chooses one or more eligible own Activities and may add a note.
3. ProgrACE creates a DRAFT Claim. Evidence and note can still be changed.
4. The Athlete submits the Claim.
5. SUBMITTED Claim identity/evidence becomes immutable under the existing lifecycle.

Only one Claim per Prescription is allowed. DRAFT/unplanned content and cancelled post-boundary training are not valid new actionable assignments.

## Workflow H — Coach Validation

1. A submitted Claim receives the existing automatic factual evaluation and validation checks.
2. Claims needing attention appear in an authorized Coach/Admin review queue.
3. The reviewer examines Prescription target and submitted evidence.
4. The reviewer records VERIFIED, PARTIAL, or REJECTED. Notes are required for PARTIAL or REJECTED.
5. The stored validation remains associated with the Claim; ProgrACE does not rewrite the Activity or Prescription.

NEEDS_REVIEW is an existing automatic result indicating that human judgment is required; it is not a Coach decision option.

## Workflow I — Training Evaluation

The operational evaluation derives session state from published Prescriptions, Claim lifecycle, validation, date, and lifecycle boundaries:

- submitted and validated: VERIFIED, PARTIAL, NEEDS_REVIEW, or REJECTED;
- submitted without final validation: SUBMITTED;
- Claim still being prepared: DRAFT;
- past expected Prescription without Claim: MISSED;
- today's unclaimed Prescription: NOT_CLAIMED;
- future Prescription: UPCOMING.

Only PUBLISHED weeks participate. A missing/DRAFT week does not generate a negative consequence. A Prescription before `tracking_start_date` is protected from a false historical MISSED outcome. Expected training stops before the cancellation effective date.

Evaluation presents factual counts and attention lists; it does not produce a proprietary compliance/readiness score.

## Workflow J — Training Progress

1. Athlete, authorized Coach, or Admin opens Training Progress for one Program.
2. The page identifies Program, Athlete, Race, date context, and current week where applicable.
3. Planned running distance comes only from explicit component distance targets; duration is never converted into estimated distance.
4. Completed running distance uses unique RUNNING Activities attached to SUBMITTED Claims for Prescriptions in PUBLISHED weeks.
5. Weekly outcome counts reuse the existing evaluation states.
6. Running Trend can filter All Running, Easy, Medium, Long, or Speed.
7. Multi-Activity distance and duration are summed; whole-session pace is total duration divided by total distance. HR and RPE remain Activity-level for multiple Activities.

Historical Programs associated with COMPLETED Race Goals remain analyzable. Training Progress does not predict fitness or Race outcome.

## Workflow K — Race Result

1. On or after Race Date, an authorized Athlete, Coach, or Admin may record the factual Race Result.
2. The user chooses FINISHED, DNF, or DNS.
3. FINISHED requires a positive finish time; DNF/DNS must not have one.
4. Optional notes may be added. Manual mistakes can be corrected later by an authorized actor.
5. If FINISHED and a target exists, ProgrACE derives the signed time difference. It does not store a success/failure score.

Race Result is independent from Race Goal lifecycle: an ACTIVE goal can have a result, and a COMPLETED historical goal may have none. Recording a result does not complete the goal.

## Workflow L — Copy Training Program

1. Coach/Admin opens Create Training Program and selects an existing visible source Program.
2. The user selects an eligible destination ACTIVE Race Goal for the same Race.
3. The server verifies actual role, source ownership for a non-Admin Coach, destination status, and same-Race relationship.
4. ProgrACE creates a new DRAFT Program and copies weeks, Prescriptions, and components.
5. Copied weeks are DRAFT. Claims, Activities, Validations, cancellation data, and the source Athlete's tracking boundary are not copied.

The Coach can inspect/edit the new DRAFT before publication.

## Workflow M — Program Cancellation

### Athlete-initiated request

1. Athlete opens their PUBLISHED Program and provides a required reason.
2. ProgrACE creates one PENDING Cancellation Request; the Program remains PUBLISHED.
3. The owner Coach/Admin reviews the immutable request.
4. APPROVED changes the Program to CANCELLED using the original request reason; DECLINED leaves it PUBLISHED and records the review.

### Coach/Admin direct cancellation

1. Authorized owner Coach/Admin opens an eligible PUBLISHED Program.
2. The user supplies a required cancellation reason and confirms.
3. If no request is pending, ProgrACE atomically marks the Program CANCELLED with actor/time/reason audit data.

### DRAFT deletion

An authorized owner Coach/Admin may permanently delete a DRAFT Program through the dedicated delete operation. This is not cancellation and does not create a CANCELLED historical Program.

### Status distinctions

- **DRAFT:** editable preparation; can be deleted by authorized Coach/Admin.
- **PUBLISHED:** active/assigned Program; can be progressively planned or cancelled.
- **CANCELLED:** terminal immutable lifecycle result that preserves history and stops future expected-training consequences from the effective date.
- **ARCHIVED:** existing terminal historical status. M15 does not automatically archive a cancelled Program and provides no new Archive workflow.

## Repository Evidence

- `app/dashboard/`
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
- `supabase/migrations/`
