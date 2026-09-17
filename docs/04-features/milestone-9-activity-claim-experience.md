# Milestone 9 — Activity Evidence to Claim experience

## Domain boundary

Milestone 9 improves how an athlete finds existing Activity Evidence for a Training Prescription.
It does not create, select, recommend, score, validate, or submit a Claim automatically.

The athlete-controlled flow remains:

`Training Prescription → Find Activity Evidence → Select evidence → DRAFT Claim → Review → Submit → Validation`

MANUAL and STRAVA Activities are equivalent Claim evidence. Their source is displayed for context
but does not change eligibility or Claim behavior.

## Candidate presentation

The Claim builder loads at most 30 eligible Activities from the previous 30 days. Activities already
used by another Claim are excluded under the existing ownership and RLS model. Candidate ordering is
deterministic and presents Activities within three calendar days of the Prescription first.

Calendar proximity compares the Prescription's date with the UTC calendar date of `started_at`.
Labels such as `Same day`, `1 day before`, and `2 days after` describe navigation context only. They
are not match scores or recommendations, and the athlete decides which evidence belongs to the workout.

## Preserved lifecycle

Milestone 9 makes no schema, RLS, Claim RPC, submission, immutability, or Validation changes. Drafts
continue to support multiple Activities, add/remove evidence, `athlete_note`, and explicit submission.
Existing Milestone 6 Validation continues to run only after submission.
