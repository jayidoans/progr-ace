import Link from "next/link";

import { formatComponent, formatTrainingWeekRange } from "@/src/features/training/format";
import type { WeekWithPrescriptions } from "@/src/features/training/queries";
import { deriveComplianceState } from "@/src/features/validation/engine/compliance";
import { distanceCompletion, validationLabel } from "@/src/features/validation/format";

const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type WeeklyTrainingCalendarProps = {
  activeMode?: "ATHLETE" | "COACH" | "ADMIN" | null;
  canClaim?: boolean;
  isCurrent?: boolean;
  week: WeekWithPrescriptions;
  weekContextLabel?: string;
};

export function WeeklyTrainingCalendar({
  activeMode,
  canClaim = false,
  isCurrent = false,
  week,
  weekContextLabel,
}: WeeklyTrainingCalendarProps) {
  const start = new Date(`${week.start_date}T00:00:00Z`);
  const days = weekdays.map((label, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const isoDate = date.toISOString().slice(0, 10);
    return {
      label,
      isoDate,
      day: date.getUTCDate(),
      prescriptions: week.prescriptions.filter((item) => item.scheduled_date === isoDate),
    };
  });

  return (
    <section
      className={`rounded-xl bg-white p-5 shadow-sm ring-1 ${
        isCurrent
          ? activeMode === "ATHLETE"
            ? "ring-emerald-300"
            : "ring-blue-300"
          : "ring-gray-200"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {weekContextLabel ? (
            <p className={`text-xs font-bold uppercase tracking-wide ${activeMode === "ATHLETE" ? "text-emerald-700" : "text-blue-700"}`}>
              {weekContextLabel}
            </p>
          ) : null}
          <h2 className="text-lg font-bold text-gray-950">
            Week {week.week_number} · {formatTrainingWeekRange(week.start_date, week.end_date)}
          </h2>
        </div>
        {week.phase ? <p className="text-sm font-semibold text-indigo-700">{week.phase}</p> : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <div className="min-h-36 rounded-lg border border-gray-200 p-3" key={day.isoDate}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide text-gray-500">{day.label}</span>
              <span className="text-xs text-gray-400">{day.day}</span>
            </div>
            {day.prescriptions.length === 0 ? (
              <p className="mt-5 text-sm font-medium text-gray-400">Rest day</p>
            ) : (
              <div className="mt-3 space-y-3">
                {day.prescriptions.map((prescription) => (
                  <div key={prescription.id}>
                    <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                      {prescription.training_menu}
                    </span>
                    <p className="mt-2 text-sm font-bold text-gray-950">{prescription.title}</p>
                    {prescription.components.map((component) => (
                      <p className="mt-1 text-xs leading-5 text-gray-600" key={component.id}>
                        {formatComponent(component)}
                      </p>
                    ))}
                    {canClaim ? (() => {
                      const compliance = deriveComplianceState(
                        prescription.scheduled_date,
                        prescription.claim,
                      );
                      const stateStyle =
                        compliance === "VERIFIED"
                          ? "bg-emerald-50 text-emerald-700"
                          : compliance === "PARTIAL" || compliance === "DRAFT"
                            ? "bg-amber-50 text-amber-700"
                            : compliance === "REJECTED" || compliance === "MISSED"
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700";

                      return prescription.claim ? (
                        <Link
                          className={`mt-3 inline-flex rounded-md px-2.5 py-1.5 text-xs font-bold ${stateStyle}`}
                          href={`/dashboard/claims/${prescription.claim.id}`}
                        >
                          {compliance === "DRAFT" ? "Continue draft" : validationLabel(compliance)}
                        </Link>
                      ) : (
                        <div className="mt-3">
                          <span className={`inline-flex rounded-md px-2.5 py-1.5 text-xs font-bold ${stateStyle}`}>
                            {validationLabel(compliance)}
                          </span>
                          <Link
                            className="mt-2 block text-xs font-bold text-indigo-700"
                            href={`/dashboard/training/prescriptions/${prescription.id}/claim`}
                          >
                            Claim activity
                          </Link>
                        </div>
                      );
                    })() : null}
                    {prescription.claim?.validation ? (() => {
                      const distanceCheck = prescription.claim.validation.checks.find((check) =>
                        ["DISTANCE", "TOTAL_DISTANCE"].includes(check.check_type),
                      );
                      const completion = distanceCheck ? distanceCompletion(distanceCheck) : null;
                      const reason = prescription.claim.validation.checks.find(
                        (check) => check.result === "NOT_EVALUABLE",
                      )?.message;
                      return (
                        <div className="mt-2 text-xs text-gray-600">
                          {completion !== null ? <p>Distance completion: {completion}%</p> : null}
                          {prescription.claim.validation.result === "NEEDS_REVIEW" && reason ? (
                            <p className="mt-1 line-clamp-3">{reason}</p>
                          ) : null}
                        </div>
                      );
                    })() : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
