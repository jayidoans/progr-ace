# Milestone 4 — Manual activity evidence

## Domain boundary

An activity records what an athlete actually did. It is evidence, not a training prescription, completion decision, claim, validation, or evaluation. Milestone 4 therefore adds no foreign key from `activities` to a prescription or claim and performs no automatic matching.

The canonical evidence model uses one `activities` table for manual evidence now and normalized provider evidence later. `source` is constrained to `MANUAL` and the future-reserved `STRAVA`; authenticated application clients cannot write provider-controlled fields or create `STRAVA` rows. No Strava integration exists in this milestone.

Sport type describes the observed activity independently from the coaching menu. Supported values are `RUNNING`, `STRENGTH_TRAINING`, `WALKING`, `CYCLING`, `PADEL`, and `OTHER`. A running subtype is intentionally deferred because it is optional classification and risks duplicating the prescription menu.

## Canonical units and derived pace

Distance is stored as integer meters, duration as integer seconds, heart rate as BPM, and elevation gain as integer meters. RPE is optional and constrained to 1–10. Pace is never stored: the application derives seconds per kilometer from positive distance and duration. Missing or zero distance, or missing duration, produces no pace.

The manual-entry UI accepts kilometers and `MM:SS` or `HH:MM:SS`, validates on the server with Zod, and normalizes before insert. Running entries require a positive distance or duration. Non-running activities, such as strength training, may have no distance.

## Privacy and authorization

Forced RLS restricts activity reads to the owning athlete. Authenticated athletes may create their own manual activities and update or delete only their own manual evidence. `athlete_id` comes from the authenticated server session. Normal clients have no insert/update grant for `source`, `external_activity_id`, or `raw_data`.

Activity notes may contain health or family context and remain private. Coach, admin, trainer, or supervisor access is not added because the current model has no verified coach–athlete assignment relationship or audit workflow. A future milestone must define that relationship before widening access.

## Claim and provider behavior

Milestone 5 relates Activity Evidence to a Training Prescription through `training_claims` and
`claim_activities` without changing what the Activity itself means. Evidence linked to a draft Claim
remains editable. Evidence linked to a submitted Claim cannot be edited or deleted; this is enforced
at the database boundary as well as represented in the UI.

Future Strava normalization may populate the same canonical columns plus `external_activity_id` and `raw_data` through a trusted server-side path. Browser clients must never be able to impersonate that provider path.

The Bormar training-report fields map cleanly to this evidence model: actual distance, total time, average heart rate, RPE, and athlete notes are activity facts. They do not imply fulfillment of the planned workout.
