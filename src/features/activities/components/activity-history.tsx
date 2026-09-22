"use client";

import { useEffect, useState } from "react";

import { ACTIVITY_SPORT_TYPES, type ActivitySportType } from "@/src/features/activities/format";
import {
  filterActivityHistory,
  groupActivitiesByCalendarWeek,
  resolveActivityWeekAnchor,
  revealNextActivityWeekIndex,
  revealPreviousActivityWeekIndex,
  type ActivityClaimFilter,
} from "@/src/features/activities/history";
import type { ActivityWithClaimUsage } from "@/src/features/activities/queries";
import { formatTrainingWeekRange } from "@/src/features/training/format";
import { usePrependScrollAnchor } from "@/src/features/ui/use-prepend-scroll-anchor";
import { ActivitySummary } from "./activity-summary";

type ActivityHistoryProps = {
  activities: ActivityWithClaimUsage[];
  today: string;
};

const sportTypeLabels: Record<ActivitySportType, string> = {
  RUNNING: "Running",
  STRENGTH_TRAINING: "Strength Training",
  WALKING: "Walking",
  CYCLING: "Cycling",
  PADEL: "Padel",
  OTHER: "Other",
};

export function ActivityHistory({ activities, today }: ActivityHistoryProps) {
  const [claimFilter, setClaimFilter] = useState<ActivityClaimFilter>("ALL");
  const [sportType, setSportType] = useState<ActivitySportType | "ALL">("ALL");
  const matchingActivities = filterActivityHistory(activities, claimFilter, sportType);
  const groups = groupActivitiesByCalendarWeek(matchingActivities);
  const anchor = resolveActivityWeekAnchor(groups, today);
  const [firstVisible, setFirstVisible] = useState(Math.max(0, anchor.index));
  const [lastVisible, setLastVisible] = useState(Math.max(0, anchor.index));
  const preserveScrollAnchor = usePrependScrollAnchor(firstVisible);

  useEffect(() => {
    setFirstVisible(Math.max(0, anchor.index));
    setLastVisible(Math.max(0, anchor.index));
  }, [claimFilter, sportType, anchor.index]);

  if (activities.length === 0) {
    return <EmptyActivities title="No recent activities" description="You don't have any recorded activities in the last two months." />;
  }

  return (
    <section className="space-y-5" aria-label="Activity history">
      <div className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <label className="min-w-44 flex-1 text-sm font-semibold text-gray-800">
          Claim status
          <select className="mt-2 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-normal" onChange={(event) => setClaimFilter(event.target.value as ActivityClaimFilter)} value={claimFilter}>
            <option value="ALL">All Activities</option>
            <option value="CLAIMED">Claimed</option>
            <option value="NOT_CLAIMED">Not Claimed</option>
          </select>
        </label>
        <label className="min-w-44 flex-1 text-sm font-semibold text-gray-800">
          Activity type
          <select className="mt-2 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-normal" onChange={(event) => setSportType(event.target.value as ActivitySportType | "ALL")} value={sportType}>
            <option value="ALL">All Types</option>
            {ACTIVITY_SPORT_TYPES.map((type) => <option key={type} value={type}>{sportTypeLabels[type]}</option>)}
          </select>
        </label>
      </div>

      {matchingActivities.length === 0 ? <EmptyActivities title="No matching activities" description="No activities match the selected filters." /> : <ActivityWeekGroups anchor={anchor} firstVisible={firstVisible} groups={groups} lastVisible={lastVisible} onLoadNext={() => setLastVisible((current) => revealNextActivityWeekIndex(current, groups.length))} onLoadPrevious={() => { const firstGroup = groups[firstVisible]; preserveScrollAnchor(`activity-week-${firstGroup.id}`); setFirstVisible(revealPreviousActivityWeekIndex); }} />}
    </section>
  );
}

function ActivityWeekGroups({
  anchor,
  firstVisible,
  groups,
  lastVisible,
  onLoadNext,
  onLoadPrevious,
}: {
  anchor: ReturnType<typeof resolveActivityWeekAnchor<ActivityWithClaimUsage>>;
  firstVisible: number;
  groups: ReturnType<typeof groupActivitiesByCalendarWeek<ActivityWithClaimUsage>>;
  lastVisible: number;
  onLoadNext: () => void;
  onLoadPrevious: () => void;
}) {
  const visibleGroups = groups.slice(firstVisible, lastVisible + 1);
  const hasPreviousGroups = firstVisible > 0;
  const hasNextGroups = lastVisible < groups.length - 1;
  const context = anchor.context === "CURRENT"
    ? "Current week"
    : anchor.context === "PREVIOUS"
      ? "This week has no activities. Showing the most recent activity week."
      : "This week has no activities. Showing the next recorded activity week.";

  return <div className="space-y-5">
    {hasPreviousGroups ? <LoadWeeksButton direction="Previous" onClick={onLoadPrevious} /> : null}
    {visibleGroups.map((group, index) => {
      const isAnchor = firstVisible + index === anchor.index;
      return <section className={`rounded-xl bg-white p-5 shadow-sm ring-1 ${isAnchor && anchor.context === "CURRENT" ? "ring-emerald-300" : "ring-gray-200"}`} id={`activity-week-${group.id}`} key={group.id}>
        {isAnchor ? <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{context}</p> : null}
        <h2 className="text-lg font-bold text-gray-950">{formatTrainingWeekRange(group.startDate, group.endDate)}</h2>
        <div className="mt-4 space-y-4">{group.activities.map((activity) => <ActivitySummary activity={activity} key={activity.id} />)}</div>
      </section>;
    })}
    {hasNextGroups ? <LoadWeeksButton direction="Next" onClick={onLoadNext} /> : null}
  </div>;
}

function LoadWeeksButton({ direction, onClick }: { direction: "Next" | "Previous"; onClick: () => void }) {
  return <div className="flex justify-center"><button className="min-h-11 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-700" onClick={onClick} type="button">Load {direction} Weeks</button></div>;
}

function EmptyActivities({ description, title }: { description: string; title: string }) {
  return <section className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200"><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-gray-600">{description}</p></section>;
}
