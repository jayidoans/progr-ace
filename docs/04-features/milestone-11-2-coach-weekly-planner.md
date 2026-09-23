# M11.2 — Coach weekly training planner

The Coach Training Schedule supports progressive planning for an existing `PUBLISHED` Training Program. Full-program XLSX import remains a separate supported workflow.

## Workflow

- Merely viewing a missing calendar week keeps it **UNPLANNED** and performs no database write.
- **Plan This Week** atomically creates the one corresponding `DRAFT` week.
- An authorized Coach can create, edit, and delete draft sessions and their ordered workout components.
- Deleting the final session leaves an intentional, empty `DRAFT` week.
- A draft week needs at least one session before it can be published.
- Publishing changes the whole week atomically to `PUBLISHED`; the planner cannot edit or delete it afterward.

Only a `PUBLISHED` week is visible and actionable for the Athlete. Existing Claim, Validation, MISSED, and M10 evaluation behavior then applies without formula or lifecycle changes.

## Security and boundaries

Planner mutations use narrow authenticated database functions. Each function checks the caller's actual ADMIN role or COACH role plus program ownership. Active UI mode is never authorization. General table RLS is not broadened for published-program writes.

Week dates are derived from the Program calendar and clamped to its fixed start/end dates, including partial first or final weeks. Prescription dates must remain within their selected week. The existing Race Date guard remains the upper boundary; weekly planning never changes Program dates.

## Deferred

Published-week revision, unpublish, copying or duplicating weeks/sessions, explicit rest weeks, drag-and-drop, recurring or generated workouts, and weekly XLSX import remain out of scope.
