# Milestone 12 — Coach Athlete Progress and Race Goal Completion

## Coach athlete progress

The Coaching → Athletes experience lists athletes through the existing authoritative Training Program relationship. A Coach sees published programs they created; an Admin retains the existing broader view. Having the COACH role alone does not expose every athlete.

Each athlete view reuses the established M10 session states (`VERIFIED`, `PARTIAL`, `NEEDS_REVIEW`, `REJECTED`, `MISSED`, and `UPCOMING`). It does not introduce a score, ranking, or new compliance formula. When more than one published program exists for a Race Goal, the newest program by start date is the primary progress context and historical programs remain counted and accessible through existing program records.

M11 planning semantics remain authoritative: missing weeks are unplanned, DRAFT weeks are not athlete assignments, and only PUBLISHED weekly prescriptions participate in athlete action and M10 evaluation.

## Coach-verified Race Goal completion

Athletes may still update or cancel their own ACTIVE Race Goal, but they cannot mark it COMPLETED. Completion is performed through an atomic database operation that requires an authenticated Admin or an authorized Coach who created a Training Program for that Race Goal. A Coach cannot use the operation to complete their own goal.

Completion is available only on or after the Race Date. It is a lifecycle closure, not evidence of perfect compliance, target-time achievement, or a particular Validation result.

`completed_at` and `completed_by` record the server-generated completion audit. Historical COMPLETED goals from before this milestone retain their original update time as `completed_at`; their original completion actor remains unknown.

Completing a Race Goal changes only its lifecycle and audit fields. Training Programs are not automatically archived, and Training Weeks, Prescriptions, Activities, Claims, Validations, and Strava connections remain unchanged.

## New Training Programs

Only ACTIVE Race Goals are shown when creating or importing a new Training Program. A database trigger independently rejects new programs that reference COMPLETED or CANCELLED goals, so the rule does not rely on the user interface.

## Date semantics and limits

Race-date eligibility uses the database calendar date, consistent with existing date-only Race and Prescription fields. Athlete progress is bounded to the 50 most recent published programs visible to the current Coach/Admin. No new Coach assignment table, Race result capture, completion request workflow, or Training Program archive automation is introduced.
