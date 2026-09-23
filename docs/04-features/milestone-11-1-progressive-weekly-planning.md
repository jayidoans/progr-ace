# M11.1 — Progressive weekly planning foundation

Training Programs keep their fixed `start_date` and `end_date`; the associated Race Date is the hard upper boundary. Weekly planning never extends either boundary.

## Week lifecycle

ProgrACE stores only weeks that a Coach has started planning:

- a missing calendar-week row is **UNPLANNED**;
- a stored `DRAFT` week is visible to its authorized Coach/Admin but is not assigned training for the Athlete;
- a stored `PUBLISHED` week is assigned training and its Prescriptions use the existing Claim, Validation, MISSED, and evaluation behavior.

UNPLANNED is not a rest week. A PUBLISHED week may still contain individual days without Prescriptions; those days retain the existing no-session/rest presentation.

## Backward compatibility

The migration marks existing weeks in DRAFT programs as `DRAFT`. Weeks belonging to existing PUBLISHED or ARCHIVED programs are marked `PUBLISHED`, preserving historical assigned training. Publishing a DRAFT program publishes all of its existing weeks in the same transaction, so the full XLSX import workflow continues to require only the existing program-level Publish action.

Athlete queries expose only PUBLISHED weeks and their Prescriptions. Coach owners and Admin can inspect DRAFT content. Missing weeks are materialized only as read-only calendar presentation objects, not placeholder database rows.

M10 continues using its existing formulas but filters its inputs to PUBLISHED weeks. Claim creation and submission require a PUBLISHED week. M6 Validation semantics and existing Claims/Validations are unchanged.

The M11.2 editor will provide controlled creation, editing, and publication of individual weeks. M11.1 intentionally provides no weekly mutation controls.
