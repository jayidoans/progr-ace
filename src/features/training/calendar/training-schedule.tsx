import Link from "next/link";

import { WeeklyTrainingCalendar } from "@/src/features/training/calendar/weekly-training-calendar";
import type { TrainingScheduleNavigation, TrainingScheduleWeek } from "@/src/features/training/queries";

type TrainingScheduleProps = {
  activeMode: "ATHLETE" | "COACH" | "ADMIN" | null;
  canClaim: boolean;
  canPlan: boolean;
  canReviewCurrentWeek: boolean;
  programId: string;
  today: string;
  week: TrainingScheduleWeek;
  nextWeek?: TrainingScheduleWeek;
  navigation: TrainingScheduleNavigation;
  canExtendToRaceDate?: boolean;
  cancelledAt?: string | null;
};

function weekHref(programId: string, weekStart: string) {
  return `/dashboard/training/${programId}?week=${encodeURIComponent(weekStart)}`;
}

export function TrainingSchedule({ activeMode, canClaim, canPlan, canReviewCurrentWeek, programId, today, week, nextWeek, navigation, canExtendToRaceDate = false, cancelledAt = null }: TrainingScheduleProps) {
  const contextLabel = navigation.context === "CURRENT" ? "Current week" : navigation.context === "UPCOMING" ? "Upcoming program" : "Most recent program week";

  return (
    <section aria-label="Training calendar" className="space-y-4">
      <div className="flex justify-end"><Link className="inline-flex min-h-11 items-center rounded-md border border-indigo-300 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" href={`/dashboard/training/${programId}/progress`}>Training Progress</Link></div>
      {cancelledAt ? <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">This program has been cancelled. The existing training plan remains available for reference.</p> : null}
      {navigation.previousWeekStart ? <div className="flex justify-center"><Link className="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700" href={weekHref(programId, navigation.previousWeekStart)}>Load Previous Weeks</Link></div> : null}
      <div id={`training-week-${week.id}`}><WeeklyTrainingCalendar activeMode={activeMode} canClaim={canClaim} canPlan={canPlan} canReviewCurrentWeek={canReviewCurrentWeek} canExtendToRaceDate={navigation.isAnchorWeek && canExtendToRaceDate} cancelledAt={cancelledAt} isCurrent={navigation.isAnchorWeek} nextWeek={navigation.isAnchorWeek ? nextWeek : undefined} programId={programId} today={today} week={week} weekContextLabel={navigation.isAnchorWeek ? contextLabel : undefined} /></div>
      {navigation.nextWeekStart ? <div className="flex justify-center"><Link className="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700" href={weekHref(programId, navigation.nextWeekStart)}>Load Next Weeks</Link></div> : null}
    </section>
  );
}
