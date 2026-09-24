# M14.3 — Copy Existing Training Program

## Purpose

M14.3 adds a Coach workflow for making a one-time copy of an existing Training Program for another Athlete's Race Goal. It is a plan-copying operation, not a shared template or synchronization relationship.

## Eligibility and authorization

Only an authenticated Coach or Admin can copy a program. A Coach may use only programs whose `created_by` is the Coach. Admins retain their existing broader administrative authority. The destination Race Goal must be `ACTIVE`, and the source and destination goals must reference the same Race. Athlete/Coach active mode is never used as authorization.

## Copied hierarchy

The operation creates new identities for the destination Training Program, Training Weeks, Training Prescriptions, and Prescription Components. Program name, description, dates, week numbers, phases, prescription fields, and all component planning fields are preserved. Dates are not shifted and targets are not scaled, even when the destination Athlete has a different target finish time.

The destination Program is `DRAFT`; every copied Week is `DRAFT`, regardless of the source Program or Week status. The copied plan can therefore be reviewed and edited through the existing weekly planner before publication.

## Tracking boundary

Program dates may remain historical, but the copied Program does not inherit the source Athlete's `tracking_start_date`. The destination row uses the current M11.3 default, so evaluation begins from the destination adoption date.

## Explicitly excluded data

Activities, Strava data, Claims, claim activities, Validations, RPE, evaluation/analytics data, Race Results, audit history, and source identifiers are never copied. Source and destination are independent after the transaction.

## Atomicity and database boundary

`copy_training_program(source_program_id, destination_race_goal_id)` is a narrow `SECURITY DEFINER` PostgreSQL function. It verifies authentication, actual Coach/Admin roles, source ownership, destination ACTIVE status, and same-Race membership before inserting the complete hierarchy. The function runs as one transaction, so a child insert failure rolls back the destination hierarchy. It returns only the new Program ID and is executable by authenticated users; authorization is enforced inside the function.

## User flow

The existing Create Training Program page includes eligible source cards. Each card shows source Athlete, Race, Program status, week count, and session count. The Coach selects an ACTIVE destination goal in the same Race, confirms the copy, and is redirected to the new draft Program. If no same-Race source is available, manual creation and XLSX import remain available.

## Limitations

Cross-Race copying, persistent copy lineage, program templates, synchronization, date shifting, pace scaling, and weekly XLSX copying are intentionally excluded.
