"use client";

import { useMemo, useState } from "react";

import { ACTIVITY_SPORT_TYPES, formatSportType } from "@/src/features/activities/format";
import { addClaimActivity } from "@/src/features/claims/actions";
import { ActivityEvidenceCard } from "@/src/features/claims/components/activity-evidence-card";
import type { ClaimCandidate } from "@/src/features/claims/candidates";

const INITIAL_VISIBLE_ACTIVITY_COUNT = 3;

type AvailableClaimActivitiesProps = {
  activities: ClaimCandidate[];
  claimId: string;
};

export function AvailableClaimActivities({ activities, claimId }: AvailableClaimActivitiesProps) {
  const [sportType, setSportType] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ACTIVITY_COUNT);
  const filteredActivities = useMemo(() => activities.filter((activity) =>
    sportType === "ALL" || activity.sport_type === sportType,
  ), [activities, sportType]);
  const visibleActivities = filteredActivities.slice(0, visibleCount);

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6" aria-labelledby="other-available-activities">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-950" id="other-available-activities">Other available activities</h2>
          <p className="mt-1 text-sm text-gray-600">
            Add another Activity only when it belongs to this same training session.
          </p>
          <p className="mt-1 text-xs text-gray-500">Showing {visibleActivities.length} of {filteredActivities.length} activities.</p>
        </div>
        <label className="text-sm font-semibold text-gray-700" htmlFor="claim-activity-category">
          Activity category
          <select
            className="mt-1 block min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            id="claim-activity-category"
            onChange={(event) => {
              setSportType(event.target.value);
              setVisibleCount(INITIAL_VISIBLE_ACTIVITY_COUNT);
            }}
            value={sportType}
          >
            <option value="ALL">All categories</option>
            {ACTIVITY_SPORT_TYPES.map((value) => <option key={value} value={value}>{formatSportType(value)}</option>)}
          </select>
        </label>
      </div>
      {visibleActivities.length === 0 ? (
        <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No activities match this category.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {visibleActivities.map((activity) => (
            <div key={activity.id}>
              <ActivityEvidenceCard activity={activity} proximityLabel={activity.proximityLabel} />
              <form action={addClaimActivity} className="mt-2 text-right">
                <input name="claimId" type="hidden" value={claimId} />
                <input name="activityId" type="hidden" value={activity.id} />
                <button className="min-h-11 text-sm font-semibold text-indigo-700 hover:text-indigo-900" type="submit">Add to claim</button>
              </form>
            </div>
          ))}
        </div>
      )}
      {visibleCount < filteredActivities.length ? (
        <button
          className="mt-4 min-h-11 w-full rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 sm:w-auto"
          onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_ACTIVITY_COUNT)}
          type="button"
        >
          Load more activities
        </button>
      ) : null}
    </section>
  );
}
