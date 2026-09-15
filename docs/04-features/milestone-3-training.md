# Milestone 3 — Training prescription and XLSX import

## Domain boundary

A training prescription records what an athlete should perform. It does not store activity evidence, completion results, actual distance, actual duration, actual pace, heart rate, RPE, Strava data, claims, validation, or evaluation.

The Milestone 3 hierarchy is:

`Race Goal → Training Program → Training Week → Training Prescription → Prescription Components`

Training menu values are `EASY`, `SPEED`, `STRENGTH`, `MEDIUM`, and `LONG`. A prescription can be scheduled on any date inside its Monday–Sunday week. `REST` is never stored; the calendar derives a Rest Day when a date has no prescription.

Component distances use meters, durations use seconds, and pace targets use seconds per kilometer. Components retain their sequence so composite sessions keep their coaching meaning.

## Official template v1

The downloadable workbook contains exactly two sheets:

- `Training Plan` — machine-readable import rows.
- `Instructions` — version marker, accepted formats, and examples that are not imported.

The marker is `PROGRACE_TEMPLATE_VERSION` with value `1` in `Instructions!A1:B1`.

The stable `Training Plan` headers are:

1. Week
2. Date
3. Phase
4. Session
5. Training Menu
6. Title
7. Description
8. Component Order
9. Workout Type
10. Target Distance
11. Target Duration
12. Repetitions
13. Distance Per Rep
14. Recovery
15. Target Pace Min
16. Target Pace Max
17. Instruction

Rows with the same Week and Session form one prescription with ordered components. Distance must include `m` or `km`; duration accepts positive seconds, `HH:MM:SS`, `MM:SS`, or a minute suffix; pace accepts `MM:SS` per kilometer. Empty calendar dates require no rows.

The import flow is upload → archive safety checks → template detection → parse → normalize → validate → preview → coach confirmation → atomic DRAFT creation. The workbook binary is not retained.

## Deferred work

The “Marathon Training - Bormar 2026” workbook remains a real-world reference, not a supported permanent format. A future `bormar-reference` adapter should remain separate from the official parser when the source workbook is available.

Its Training Report fields—actual distance, total time, average pace, average heart rate, RPE, and notes—belong to later activity-evidence and evaluation milestones. RPE should eventually support the 1–10 range, but is intentionally absent from Milestone 3.
