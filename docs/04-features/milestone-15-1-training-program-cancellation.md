# M15.1 — Training Program cancellation foundation

## Purpose and lifecycle

Training Program cancellation is a retained, audited lifecycle transition. The
supported Program statuses are `DRAFT`, `PUBLISHED`, `CANCELLED`, and
`ARCHIVED`.

- An authorized Coach or Admin may permanently delete only a `DRAFT` Program.
- An Athlete may request cancellation of their own `PUBLISHED` Program.
- A pending request leaves the Program `PUBLISHED` and fully active.
- An authorized Coach or Admin may approve or decline a pending request, or
  directly cancel a `PUBLISHED` Program when no request is pending.
- `CANCELLED` is terminal and historically retained; it is not an archive.

Cancellation does not change the Race Goal or Race Result and never deletes
Weeks, Prescriptions, Activities, Claims, Validations, or Strava evidence.

## Requests and audit data

`training_program_cancellation_requests` retains the Athlete request reason,
requester, request time, review decision, reviewer, review time, and optional
review note. Reasons are trimmed, required where applicable, and limited to
1,000 characters. A partial unique index permits only one `PENDING` request per
Program while retaining approved and declined history.

Approval atomically marks the request `APPROVED` and the Program `CANCELLED`.
The Program's final reason is the Athlete's original request reason, while the
review note remains separate. Direct cancellation uses the Coach/Admin reason.
`cancelled_at`, `cancelled_by`, and `cancellation_reason` must be complete on a
cancelled Program and absent on every other status.

If an Athlete request is already pending, direct cancellation is rejected. The
Coach must approve it, or decline it before making a distinct direct
cancellation. This avoids falsely recording a direct decision as approval of
the Athlete's reason without adding an ambiguous request status.

## Authorization and operations

All four mutations are narrow `SECURITY DEFINER` functions with an empty
`search_path`, authenticated identity from `auth.uid()`, authoritative role
checks, and Program ownership checks:

- `request_training_program_cancellation`
- `review_training_program_cancellation`
- `cancel_training_program`
- `delete_draft_training_program`

Coach authority follows `training_programs.created_by`; Coach role alone is not
sufficient. Admin retains broader authority. Athlete authority is limited to
the Race Goal Athlete. Active Mode is never authorization.

The request table uses forced RLS and read access is limited to the owning
Athlete, owning Coach, and Admin. The Program read policy now applies the same
Coach ownership boundary and keeps a cancelled Program readable by its
Athlete. Direct client deletion of Programs is revoked; the deletion RPC locks
and verifies an authorized `DRAFT`, relies on existing Week/Prescription/
Component cascades, and clears the import-preview reference before deletion.

## Evaluation and evidence boundaries

`tracking_start_date` remains the lower boundary for missing-evidence
semantics. The UTC calendar date of `cancelled_at` is the exclusive upper
boundary:

`tracking_start_date <= prescription_date < cancellation_effective_date`

Prescriptions on or after the cancellation date are no longer expected. They
do not become `MISSED`, reduce M10 counts, or contribute planned M13 volume.
No new Validation status or M10 formula was introduced.

Existing submitted Claim evidence and Validation records remain stored and
readable. M13 retains submitted Activity evidence, including evidence attached
to a session on or after the cancellation boundary, while excluding cancelled
planned distance from expected volume. It does not fabricate zero actuals.
Existing DRAFT Claims are retained, but the Program's terminal status prevents
new Claims and submission. Unrelated Activities remain independent.

## Weekly planning and Program copy

A cancelled Program no longer satisfies the existing `PUBLISHED` guard used by
the M11 planner, so starting, editing, extending, or publishing weekly plans is
unavailable. Existing schedule rows remain readable.

M14.3 may use a cancelled Program as a plan source, but the destination remains
`DRAFT`. Copying omits cancellation status, audit fields, request history,
Claims, execution evidence, and source `tracking_start_date`; the destination
keeps the accepted adoption-date behavior.

## Deferred UI

M15.1 exposes typed server query/mutation interfaces for later use. Athlete
request dialogs, Coach review controls, cancellation banners, and history UI
belong to M15.2 and are intentionally not implemented here.
