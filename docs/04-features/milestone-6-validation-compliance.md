# Milestone 6 — Validation and training compliance

## Domain boundary

A Prescription records what the Coach defined, Activity records immutable evidence, and a Claim is
the athlete's assertion connecting them. Validation is a separate deterministic comparison:

`Prescription → Submitted Claim → Validation → explainable checks`

Validation never rewrites a Prescription, Claim, or Activity. Claim status remains `DRAFT` or
`SUBMITTED`. Validation result is separately constrained to `VERIFIED`, `PARTIAL`, `NEEDS_REVIEW`,
or `REJECTED`. `REJECTED` is a Coach decision, never an automatic result.

`MISSED` is not a Claim or Validation row. The application derives it when a Prescription date is
earlier than today's UTC date and no Claim exists. This follows the project's existing UTC
date-only convention. Future unclaimed sessions are `UPCOMING`; today's is `NOT_CLAIMED`.

## Validation records and explainability

`claim_validations` has one row per submitted Claim. It retains `automatic_result` even when a
Coach decision changes the current `result`. `evaluation_source` is `AUTOMATIC` or `COACH`, and
reviewer identity comes from `auth.uid()`. Partial and Rejected Coach decisions require a note.

`validation_checks` stores ordered checks with type, target, actual, canonical unit, result, and
message. Check results are `PASS`, `FAIL`, `PARTIAL`, `NOT_EVALUABLE`, or `INFO`. These rows explain
the automatic snapshot; Coach review does not silently replace them.

Automatic validation is created by a database trigger in the same transaction that changes a Claim
from `DRAFT` to `SUBMITTED`. The internal evaluator locks the Claim and returns the existing row
when one is already present, so retries create neither duplicate Validation rows nor duplicate
checks.

## Conservative automatic rules

For a single simple component, M6 defines structured distance and duration targets as minimum
completion targets. Comparable evidence at or above the target passes; positive comparable evidence
below it produces `PARTIAL`. This introduces no percentage tolerance. Completion percentage is
descriptive only.

Running menus expect `RUNNING`; Strength expects `STRENGTH_TRAINING`. A different sport produces
`NEEDS_REVIEW`, not automatic rejection. A simple whole-activity pace is derived from canonical
meters and seconds and compared only with an explicitly stored inclusive pace range.

One Claim may aggregate multiple Activities. Distance and duration are summed only for evidence in
the expected sport category. This can verify a simple additive target, but does not claim the
activities were continuous.

Current Activity Evidence has no laps or segment boundaries. Consequently:

- interval repetitions, split distances, and recovery are `NOT_EVALUABLE`;
- a Tempo component cannot be proven from whole-activity duration;
- a composite target may show total distance, but component order and execution remain
  `NOT_EVALUABLE`;
- any essential unsupported structure makes the overall result `NEEDS_REVIEW`.

Heart rate and RPE remain visible context only because M3 contains no structured HR or RPE targets.
Activity Notes and Claim Notes are shown to authorized users but are never parsed into rules.

## Coach review and authorization

The authoritative roles remain `ADMIN`, `ATHLETE`, and `COACH`. An athlete can read Validation and
checks for their own Claims but has no validation mutation grants. A Coach can read evidence and
review only submitted Claims whose Prescription belongs to a Training Program where
`created_by = auth.uid()`; draft Claim content remains private to the athlete.
An Admin has explicit administrative read/review access consistent with M3.

Coach review uses a constrained database RPC and is available only when automatic evaluation is
`NEEDS_REVIEW`. It accepts `VERIFIED`, `PARTIAL`, or `REJECTED`, derives the reviewer internally, and
retains the automatic result and checks.

Both validation tables use forced RLS and expose only SELECT to authenticated clients. Anonymous
access and direct application writes are revoked. Security-definer helper functions have empty
search paths and narrow execution grants.

## Historical input protection

M5 submitted Claims and their Activity Evidence remain immutable. M6 additionally installs database
triggers preventing changes to a Prescription or its components after a submitted Claim depends on
them. Future Prescriptions without submitted evidence remain editable according to M3 policies.

## Deferred work

Strava OAuth, sync, laps, segments, HR-zone validation, AI interpretation, Evaluation, analytics,
training load, race prediction, and M7 functionality are not implemented.
