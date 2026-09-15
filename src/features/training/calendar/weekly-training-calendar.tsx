import { formatComponent } from "@/src/features/training/format";
import type { WeekWithPrescriptions } from "@/src/features/training/queries";

const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type WeeklyTrainingCalendarProps = { week: WeekWithPrescriptions };

export function WeeklyTrainingCalendar({ week }: WeeklyTrainingCalendarProps) {
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
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-950">Week {week.week_number}</h2>
        <p className="text-sm font-semibold text-indigo-700">{week.phase}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <div className="min-h-36 rounded-lg border border-gray-200 p-3" key={day.isoDate}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide text-gray-500">{day.label}</span>
              <span className="text-xs text-gray-400">{day.day}</span>
            </div>
            {day.prescriptions.length === 0 ? (
              <p className="mt-5 text-sm font-medium text-gray-400">Rest Day</p>
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
