# M11.3 — Mid-Program Adoption & Historical Planning

ProgrACE supports adopting an already-running training cycle. A Program's
`start_date` is the beginning of the planned training cycle; it is not the
record's `created_at` and may be weeks or months in the past.

## Planning dates

Manual weeks, prescriptions, and XLSX plans may use historical dates when they
remain inside the Program and Race boundaries. Week structure remains
Monday–Sunday (with the existing partial program boundary rules), and the Race
Date remains the legitimate upper bound. Published content remains immutable.

The XLSX parser derives the plan start from the earliest imported week and does
not compare training dates with today's date or the Program record timestamp.
Import failures are surfaced as parsing, template/row, domain, expiry, or
authorization messages rather than presenting every failure as an unreadable
workbook.

## Adoption/tracking boundary

`training_programs.tracking_start_date` is a date-only boundary meaning when
ProgrACE begins treating missing execution evidence as eligible for normal
MISSED evaluation. It does not mean that training started on that date.

New manual and imported Programs default tracking to the adoption date. A
forward migration backfills existing Programs from their `created_at` date to
preserve their previous evaluation behavior. M14.3 copies plan dates and
structure but uses the destination adoption date; source execution history is
not copied.

Before the tracking boundary, an unclaimed published Prescription remains
`NOT_CLAIMED` rather than becoming a false `MISSED` item. On or after the
boundary, existing M6/M10 date semantics remain unchanged. Draft and unplanned
weeks remain outside evaluation as before.

## Other domains

No Activities, Claims, Validations, Strava evidence, Race Results, or analytic
actuals are created for historical planning. M13 continues to derive actual
training only from submitted Claim evidence; M12 Race Goal lifecycle and M14
Race Result behavior are unchanged. M14.3 remains same-Race, authorized, and
atomic, with independent destination identities and preserved historical plan
dates.

## Limitations

This milestone does not infer historical execution, backfill adoption evidence,
add a historical edit mode for published plans, or impose arbitrary age limits
on historical training dates.
