# Milestone 14.1 — Race Result Foundation

## Purpose

Race Goals remain historical targets and Race Results record explicit Race Day
outcomes. A result is related to one Athlete Race Goal and does not overwrite
the target, change the goal lifecycle, or alter Training Progress.

## Persistence and constraints

`race_results` stores one manual result per `athlete_race_goals` row. The
database enforces the one-to-one relationship, the exact `FINISHED`, `DNF`,
and `DNS` statuses, and their finish-time rules. Notes are optional and
bounded to 2,000 characters. Result source is currently `MANUAL` only.

Results are created only on or after the Race's date using the existing
database `current_date` convention. An existing valid result can be corrected
after Race Day. `recorded_by` is always the authenticated actor on creation
and is immutable during correction.

## Authorization

Athletes can read and record results for their own goals. Coaches and Admins
use the existing M12 authority: a Coach must own a Training Program for the
goal through `training_programs.created_by`; Admins have the existing broader
authority. Active Mode is not used for security decisions. CANCELLED goals
cannot receive a new result, while historical results remain readable under
the same authorization rules.

Create and update use narrow authenticated SECURITY DEFINER functions. Direct
table writes are not granted to browser clients, and RLS limits reads to the
Athlete/Coach/Admin scope above.

## Target versus actual

For a `FINISHED` result with a target time, `difference_sec` is derived as
actual finish time minus target finish time. Negative is faster, zero matches,
and positive is slower. DNF, DNS, and goals without a target have no
difference. No success score, prediction, or qualitative judgment is stored.

## Independence and boundaries

Recording or correcting a Race Result does not set `status`, `completed_at`,
or `completed_by` on the Race Goal. COMPLETED goals without a result remain
valid; ACTIVE goals may have a result. Training Programs, Claims,
Validations, Activities, Strava data, and M13 calculations are untouched.

M14.2 UI, charts, official timing, Strava inference, splits, laps, race
prediction, rankings, and performance scores are out of scope.
