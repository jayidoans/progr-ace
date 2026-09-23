# M13.2 — Running Progress Experience

## Purpose

The Training Progress page presents the accepted M13.1 running analytics for
one Athlete and Training Program. It is descriptive history: it helps a Coach
or Athlete see planned running distance, submitted running evidence, session
outcomes, and menu-specific trends over time.

## Presentation and navigation

Athletes reach the page from a Training Program's schedule. Coaches reach it
from Coaching → Athletes → an Athlete detail → Training Progress. The page
keeps the Athlete + Program context visible and does not introduce a global
Analytics area.

The page hierarchy is program context, factual summary, weekly running
distance, session outcomes, and a filtered running trend. The trend supports
All Running, Easy, Medium, Long, and Speed. Speed sessions are labelled with
whole-session pace because the product does not infer interval execution.

## Data semantics

The UI consumes `getProgramRunningAnalytics` and does not recalculate domain
analytics. Only published weeks and submitted Claim evidence represented by
M13.1 appear. Unplanned/draft weeks, draft Claims, unclaimed Activities, and
non-running Activities do not contribute. Explicit prescribed distance is
shown as planned distance; duration-only prescriptions remain without an
estimated distance.

Weekly outcome counts reuse M6/M10 state semantics. A current week is marked
as in progress and is not judged by comparing planned and completed distance.
Missing distance, pace, heart rate, and RPE are displayed as `—`. For a
Prescription supported by multiple Activities, distance and duration are the
totals from those Activities, while HR and RPE remain Activity-level details;
the UI never averages them.

## Authorization and history

The server query and M13.1 authorization remain authoritative: Athletes can
read their own authorized programs, Coaches can read programs in their
existing ownership scope, and Admins retain existing authority. Active mode is
not authorization. Completed Race Goals remain readable when the existing
program authorization permits historical access.

## Scope and limitations

This milestone adds no schema, migration, RPC, chart dependency, validation
logic, score, recommendation, prediction, HR-zone inference, Strava stream or
lap analysis, interval validation, or editing workflow. The visualizations
use accessible semantic rows, labelled bars, legends, and responsive cards;
the later M13.2 polish can add richer charts without changing the foundation.
