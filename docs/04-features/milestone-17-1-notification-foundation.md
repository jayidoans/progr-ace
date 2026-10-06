# M17.1 — Application notifications

ProgrACE stores durable, per-user application notifications for four successful domain transitions. The notification is a content snapshot and navigation aid, not the authority for a Claim, Validation, or cancellation decision. There is no Web Push in M17.1.

## Events and recipients

| Type | Existing transition | Recipient |
| --- | --- | --- |
| `CLAIM_SUBMITTED` | M6 automatic Validation ends in `NEEDS_REVIEW` after a submitted Claim | The Program creator, only when that account actually has `COACH` role |
| `CLAIM_REVIEWED` | M6 Validation changes from automatic to a Coach decision | Claim's Athlete |
| `PROGRAM_CANCELLATION_REQUESTED` | M15 Athlete cancellation request is created | The Program creator, only when that account actually has `COACH` role |
| `PROGRAM_CANCELLATION_DECIDED` | M15 pending request becomes `APPROVED` or `DECLINED` | Requesting Athlete |

Coach authority still follows `training_programs.created_by`. Having `COACH` role alone does not grant access to an unrelated Program. An Admin-only creator is not silently treated as a Coach or broadcast to other Coaches/Admins; no operational Coach notification is generated for that Program. Admin authorization for the underlying operation is unchanged. Multi-role accounts receive notifications by user ID regardless of Active Mode.

## Storage and security

`notifications` has a UUID ID, recipient user ID, constrained type, unique authoritative `event_key`, title/body snapshot, optional internal `/dashboard` target, nullable `read_at`, and creation time. `read_at IS NULL` means unread. Indexed recipient/creation and partial unread paths support the shell count and a bounded recent list. Triggers on the existing trusted Claim Validation and cancellation transitions insert notifications in the same transaction; rollback of the transition also rolls back its notification. Unique event keys prevent duplicate records on retries. The event snapshot does not change after creation.

RLS allows only the recipient to select a notification. Authenticated clients have no direct INSERT/UPDATE/DELETE grant. Security-definer RPCs with a fixed empty search path may mark one own notification or all of the current user's notifications read. Recipients, event keys, and content are never supplied authoritatively by browser input. Both database constraint and application-side validation restrict target paths to internal dashboard routes.

## Notification Center

The authenticated header shows a capped `9+` unread badge. The count is queried for the signed-in user; opening the bell loads only the 10 most recent records. Notification text needs no additional joins. A target click marks the item read before internal navigation. Items without a target remain markable. The center has an empty state and Mark all as read action. Notifications are not deleted and a full history page is deferred.

## Informational helpers

The shared `FieldHelp` control powers the existing informational `?` helpers on training, activity, race goal/result, Strava, and planner forms. It now opens on mouse hover, keyboard focus, or touch tap; closes on pointer leave, blur, outside interaction, or Escape; and opening one closes another. Existing helper copy is unchanged. Action-button tooltips, dropdowns, and dialogs are not affected.

## Online-first and deferred work

Notifications remain authenticated network data. The M16 service worker does not cache them, and the UI stores neither notification history nor credentials in browser storage. M17.2 Web Push, subscription/preferences, and permission prompts are deferred. M17.3 scheduled training reminders are deferred.

Known limits: only Coach-attention Claims (automatic `NEEDS_REVIEW`) generate submission notices; automatic verified/partial Claims do not. A later correction to an already reviewed Validation does not create a second review notification. Recent history is capped at 10 in the bell; older rows remain in the database. No separate notification preferences or full history page exist.
