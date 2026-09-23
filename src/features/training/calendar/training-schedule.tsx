"use client";

import { useState } from "react";
import Link from "next/link";

import { WeeklyTrainingCalendar } from "@/src/features/training/calendar/weekly-training-calendar";
import {
  resolveTrainingScheduleAnchor,
  revealNextWeekIndex,
  revealPreviousWeekIndex,
  visibleWeekIndexes,
} from "@/src/features/training/calendar/training-schedule-utils";
import type { TrainingScheduleWeek } from "@/src/features/training/queries";
import { usePrependScrollAnchor } from "@/src/features/ui/use-prepend-scroll-anchor";

type TrainingScheduleProps = {
  activeMode: "ATHLETE" | "COACH" | "ADMIN" | null;
  canClaim: boolean;
  canPlan: boolean;
  programId: string;
  today: string;
  weeks: TrainingScheduleWeek[];
  canExtendToRaceDate?: boolean;
  focusNextWeek?: boolean;
};

export function TrainingSchedule({ activeMode, canClaim, canPlan, programId, today, weeks, canExtendToRaceDate = false, focusNextWeek = false }: TrainingScheduleProps) {
  const anchor = resolveTrainingScheduleAnchor(weeks, today);
  const [firstVisible, setFirstVisible] = useState(anchor.index);
  const [lastVisible, setLastVisible] = useState(() => focusNextWeek ? Math.min(anchor.index + 1, weeks.length - 1) : anchor.index);
  const preserveScrollAnchor = usePrependScrollAnchor(firstVisible);

  const loadPreviousWeeks = () => {
    const firstWeek = weeks[firstVisible];
    preserveScrollAnchor(`training-week-${firstWeek.id}`);
    setFirstVisible(revealPreviousWeekIndex);
  };

  const visibleWeeks = visibleWeekIndexes(firstVisible, lastVisible).map((index) => ({
    index,
    week: weeks[index],
  }));
  const hasPreviousWeeks = firstVisible > 0;
  const hasNextWeeks = lastVisible < weeks.length - 1;
  const contextLabel = anchor.context === "CURRENT" ? "Current week" : anchor.context === "UPCOMING" ? "Upcoming program" : "Most recent program week";

  return (
    <section aria-label="Training calendar" className="space-y-4">
      <div className="flex justify-end"><Link className="inline-flex min-h-11 items-center rounded-md border border-indigo-300 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" href={`/dashboard/training/${programId}/progress`}>Training Progress</Link></div>
      {hasPreviousWeeks ? <div className="flex justify-center"><button className="min-h-11 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700" onClick={loadPreviousWeeks} type="button">Load Previous Weeks</button></div> : null}
      {visibleWeeks.map(({ index, week }) => {
        const isAnchorWeek = index === anchor.index;
        return <div id={`training-week-${week.id}`} key={week.id}><WeeklyTrainingCalendar activeMode={activeMode} canClaim={canClaim} canPlan={canPlan} canExtendToRaceDate={isAnchorWeek && canExtendToRaceDate} isCurrent={isAnchorWeek} nextWeek={isAnchorWeek ? weeks[index + 1] : undefined} programId={programId} week={week} weekContextLabel={isAnchorWeek ? contextLabel : undefined} /></div>;
      })}
      {hasNextWeeks ? <div className="flex justify-center"><button className="min-h-11 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700" onClick={() => setLastVisible((current) => revealNextWeekIndex(current, weeks.length))} type="button">Load Next Weeks</button></div> : null}
    </section>
  );
}
