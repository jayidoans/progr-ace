# Coach Current Week Training Review

## Purpose

The Coach Training Schedule provides a focused review surface for the current published week. An authorized Coach can open submitted Claim evidence session by session, leave one comment on each claimed Activity, and record one overall weekly fulfillment rating from 0 to 10 with an optional summary comment.

This feature adds coaching feedback. It does not change Claim evidence, Validation results, M10 evaluation, or training-plan publication.

## Data model

- `training_activity_comments` stores at most one Coach comment per `claim_activities` row. The comment therefore refers to the Activity in the context of the submitted Claim, not to the Activity globally.
- `training_week_reviews` stores at most one overall review per materialized Training Week, including the factual 0–10 fulfillment rating and optional Coach comment.
- Re-saving either form updates the existing row. No review history or versioning is created.

## Eligibility

Review writes require all of the following:

- an authenticated actor with the actual `COACH` role who created the Training Program, or an `ADMIN`;
- a `PUBLISHED` Training Program;
- a `PUBLISHED` Training Week containing the database current date;
- for an Activity comment, a `SUBMITTED` Claim and an existing `claim_activities` association.

Active Mode is not authorization. Athlete and unrelated Coach writes are rejected by the database operation. The owning Athlete may read the resulting feedback through existing Program ownership context.

## UI behavior

The review controls appear only on the actual Current Week card. Claimed sessions use expandable rows so Activity details and comment forms do not make the seven-day calendar excessively tall on mobile. The overall weekly review appears below the Activity list.

When an owning Athlete views the published Training Schedule, a saved overall weekly review appears directly below that week's calendar. The Athlete sees the Coach comment and the factual 0–10 fulfillment rating; no missing review is presented as a zero rating.

Simply viewing or expanding a session does not create review data.

## Boundaries

- The Coach cannot attach or detach Activities from an Athlete Claim.
- Draft Claims are not reviewable here.
- Historical or future weeks cannot be changed through this review operation.
- The rating is descriptive Coach feedback and is not an M6 Validation status, M10 formula input, compliance score, or automatic training decision.
- Comments do not mutate Activity notes, Claim notes, or Validation reviewer notes.
