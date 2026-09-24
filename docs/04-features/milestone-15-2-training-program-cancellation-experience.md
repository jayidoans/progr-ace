# M15.2 — Training Program cancellation experience

## Purpose

M15.2 presents the M15.1 cancellation foundation in the Training Program
experience. It does not change cancellation authorization, lifecycle rules, or
evaluation semantics.

## Athlete experience

An Athlete viewing their own published Program can select **Request
Cancellation** and provide a required reason of up to 1,000 characters. The
Program remains published and ordinary schedule, Activity, and Claim workflows
remain available while the request is waiting for review.

The Program management area shows a pending request with its date and reason.
After a Coach declines it, the request remains visible in compact cancellation
history with its review date and optional note, and the Athlete can submit a
new request. A cancelled Program displays its cancellation date and reason;
its Schedule, Claims, Evaluation, and Running Progress remain available as
historical information.

## Coach and Admin experience

For an authorized Program manager:

- A `DRAFT` Program offers **Delete Draft**, with explicit confirmation.
- A `PUBLISHED` Program with no pending Athlete request offers **Cancel
  Program**, with a required reason visible to the Athlete.
- A pending request displays the Athlete reason and offers **Approve
  Cancellation** or **Decline Request**, each with an optional review note and
  confirmation.

While a request is pending, direct cancellation is deliberately not shown.
The Coach must approve or decline the request first, matching the M15.1 RPC
rule. A cancelled or archived Program never shows deletion controls.

## Schedule and evidence

Cancelled Programs keep their original Schedule visible for reference. Dates
on or after the cancellation date are identified as no longer active rather
than presented as upcoming training or rest days. Existing Claim links remain
available as historical evidence; new Claim actions and weekly planning
controls are not displayed because the M15.1 Program status guards are
authoritative.

M10 and M13 use their existing M15.1 data results. The Program page explains
that training scheduled after the Program ended is not included in completion
evaluation, and Running Progress remains available as history. Cancellation
does not cancel the Race Goal.

## Security and accessibility

The UI uses thin server actions that validate form input and call the existing
M15.1 secure RPC wrappers. The database remains responsible for actor role,
ownership, lifecycle, and pending-request checks. Reasons and review notes are
rendered as ordinary escaped text.

Native confirmation dialogs include visible titles, labelled fields, keyboard
support, alert/status feedback, mobile-width constraints, and vertically
stacked actions on narrow screens. No schema, RLS, or RPC changes are made by
M15.2.

## Deferred

This milestone does not introduce a separate cancellation dashboard, a large
audit log, notification delivery, Race Goal actions, or any M15.1 lifecycle
change.
