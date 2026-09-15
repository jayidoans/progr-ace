# Milestone 5 — Training claims

## Domain boundary

A Training Prescription records what should be performed. An Activity records evidence of what
actually happened. A Training Claim is the athlete's explicit assertion that one or more selected
Activities relate to one Prescription. Milestone 5 records that relationship but does not decide
whether the workout was completed, partial, verified, rejected, or missed.

No Claim is created automatically and no Activity is automatically matched to a Prescription.
Activity date, sport, distance, duration, pace, heart rate, and RPE differences are not eligibility
rules in this milestone. Candidate Activities are merely ordered by proximity to the scheduled date.

## Schema and lifecycle

`training_claims` contains the owning athlete, one prescription, `athlete_note`, lifecycle status,
submission timestamp, and audit timestamps. Status is restricted to:

- `DRAFT` — evidence and the Claim Note may be edited; the draft may be deleted.
- `SUBMITTED` — the Claim, its evidence relationships, and every referenced Activity are immutable.

`submitted_at` must be null for a draft and present for a submitted Claim. For the MVP, a unique
index on `prescription_id` allows at most one Claim per Prescription. Deleting a draft releases that
Prescription so a replacement draft can be created.

`claim_activities` is the explicit junction between Claims and Activities. One Claim may contain
multiple Activities, while a unique index on `activity_id` prevents any Activity from being reused
in another draft or submitted Claim. Deleting a draft releases its Activities. Both junction foreign
keys and both Claim parent foreign keys use restrictive deletion to protect evidence history.

An Activity Note describes the Activity itself. A Claim Note explains why the selected evidence is
being asserted against the Prescription. Neither value overwrites the other.

## Security model

The authoritative Milestone 1 role codes are `ADMIN`, `ATHLETE`, and `COACH`. Claim access remains
owner-scoped in Milestone 5; Coach-wide review is intentionally deferred until a secure assignment
model exists.

Row Level Security is forced on both Claim tables. An authenticated athlete may:

- read only their own Claims and evidence relationships;
- create a `DRAFT` only for their own Prescription in a `PUBLISHED` Training Program;
- update only `athlete_note` on their own draft;
- add or remove only their own Activities while the Claim is a draft;
- delete only their own draft.

Anonymous access is revoked. Browser grants exclude Claim identity, status, submission timestamp,
and audit columns. Athlete identity is derived from `auth.uid()` and never trusted from form input.
Coach and Admin accounts do not receive unscoped Claim access in this milestone.

## Atomic database operations

`create_training_claim_draft` is `SECURITY INVOKER`. It derives the athlete from `auth.uid()`, creates
the draft, and inserts all selected evidence in one transaction. Any invalid evidence rolls back the
entire operation.

`submit_training_claim` is `SECURITY DEFINER` because authenticated clients deliberately lack direct
update permission on `status` and `submitted_at`. It has an empty `search_path`, accepts no athlete
parameter, checks `auth.uid()` and ownership internally, locks the Claim and eligible Program,
rechecks the published Prescription relationship and all evidence ownership, requires at least one
Activity, then sets `SUBMITTED` and `submitted_at` atomically. Anonymous execution is revoked.

`protect_submitted_activity_evidence` is also `SECURITY DEFINER` with an empty `search_path`. This is
required so its trigger can inspect Claim relationships without recursive RLS evaluation. It exposes
no result and blocks update/delete of an Activity referenced by a submitted Claim. Direct execution
is revoked from application roles.

The remaining lifecycle and junction triggers are `SECURITY INVOKER`. They reject submitted Claim
updates, immutable identity changes, junction updates, cross-athlete evidence, and evidence mutation
after submission.

## Application workflow

An athlete opens a published Training Program and sees each Prescription as `Claim activity`,
`Continue draft`, or `Submitted`. The Claim builder supports one or more available Activities and an
optional Claim Note. The review page shows the Prescription, components, selected Activity metrics,
Activity Notes, source, and descriptive distance/duration totals. Submission requires explicit
confirmation that the Claim and evidence become read-only.

Activity History and Activity Detail show `Available`, `Used in draft claim`, or `Submitted as
evidence`. Draft evidence remains editable, but deletion requires first deleting/removing the draft
relationship because the evidence foreign key is restrictive. Submitted evidence exposes no edit or
delete controls and is protected by the database trigger.

## Deferred work

Milestone 6 will define Validation and Evaluation, including any review authorization model and
outcomes. Strava remains a future Activity source; Claims remain source-agnostic and reference the
normalized Activity table.
