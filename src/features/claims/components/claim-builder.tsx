"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ACTIVITY_SPORT_TYPES, formatSportType } from "@/src/features/activities/format";
import { createClaimDraft } from "@/src/features/claims/actions";
import {
  groupClaimCandidates,
  type ClaimCandidate,
} from "@/src/features/claims/candidates";
import { ActivityEvidenceCard } from "@/src/features/claims/components/activity-evidence-card";
import type { ClaimPrescription } from "@/src/features/claims/queries";
import { formatComponent, formatTrainingDate } from "@/src/features/training/format";

type ClaimBuilderProps = {
  candidates: ClaimCandidate[];
  prescription: ClaimPrescription;
  programId: string;
};

export function ClaimBuilder({ candidates, prescription, programId }: ClaimBuilderProps) {
  const candidateGroups = groupClaimCandidates(candidates);
  const [otherSportType, setOtherSportType] = useState("ALL");
  const [otherVisibleCount, setOtherVisibleCount] = useState(2);
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(() => new Set());
  const filteredOtherCandidates = useMemo(() => candidateGroups.other.filter((candidate) =>
    otherSportType === "ALL" || candidate.sport_type === otherSportType,
  ), [candidateGroups.other, otherSportType]);
  const visibleOtherCandidates = filteredOtherCandidates.slice(0, otherVisibleCount);

  const toggleActivity = (activityId: string, selected: boolean) => {
    setSelectedActivityIds((current) => {
      const next = new Set(current);
      if (selected) next.add(activityId);
      else next.delete(activityId);
      return next;
    });
  };

  const renderCandidate = (activity: ClaimCandidate) => (
    <ActivityEvidenceCard
      activity={activity}
      control={
        <input
          aria-label={`Select ${activity.name}`}
          className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-indigo-600"
          checked={selectedActivityIds.has(activity.id)}
          onChange={(event) => toggleActivity(activity.id, event.target.checked)}
          type="checkbox"
        />
      }
      key={activity.id}
      proximityLabel={activity.proximityLabel}
    />
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
          {prescription.training_menu}
        </p>
        <h2 className="mt-2 text-xl font-bold">{prescription.title}</h2>
        <p className="mt-2 text-sm text-gray-600">
          Scheduled {formatTrainingDate(prescription.scheduled_date)}
        </p>
        <div className="mt-4 space-y-1">
          {prescription.components.map((component) => (
            <p className="text-sm text-gray-700" key={component.id}>
              {formatComponent(component)}
            </p>
          ))}
        </div>
      </section>

      <form action={createClaimDraft} className="space-y-6">
        <input name="prescriptionId" type="hidden" value={prescription.id} />
        <input name="programId" type="hidden" value={programId} />
        {[...selectedActivityIds].map((activityId) => <input key={activityId} name="activityIds" type="hidden" value={activityId} />)}

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <h2 className="text-xl font-bold">Choose activities</h2>
          <p className="mt-2 text-sm text-gray-600">
            Activities are organized by date to help you find your evidence. You decide which
            activity belongs to this workout.
          </p>
          {candidates.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              No available activities found. Activities already used in another training session are not shown.
              <Link className="ml-1 font-semibold text-indigo-700" href="/dashboard/activities/new">
                Add an activity
              </Link>
              .
            </div>
          ) : (
            <div className="mt-6 space-y-7">
              {candidateGroups.near.length > 0 ? (
                <section aria-labelledby="near-prescription-date">
                  <h3
                    className="text-xs font-bold uppercase tracking-wider text-indigo-700"
                    id="near-prescription-date"
                  >
                    Near prescription date
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">Within three calendar days before or after.</p>
                  <div className="mt-3 space-y-3">{candidateGroups.near.map(renderCandidate)}</div>
                </section>
              ) : null}
              {candidateGroups.other.length > 0 ? (
                <section aria-labelledby="other-available-activities">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3
                        className="text-xs font-bold uppercase tracking-wider text-gray-600"
                        id="other-available-activities"
                      >
                        Other available activities
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">Showing {visibleOtherCandidates.length} of {filteredOtherCandidates.length} activities.</p>
                    </div>
                    <label className="text-sm font-semibold text-gray-700" htmlFor="other-activity-category">
                      Activity category
                      <select className="mt-1 min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" id="other-activity-category" onChange={(event) => { setOtherSportType(event.target.value); setOtherVisibleCount(2); }} value={otherSportType}>
                        <option value="ALL">All categories</option>
                        {ACTIVITY_SPORT_TYPES.map((sportType) => <option key={sportType} value={sportType}>{formatSportType(sportType)}</option>)}
                      </select>
                    </label>
                  </div>
                  {visibleOtherCandidates.length === 0 ? <p className="mt-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No activities match this category.</p> : <div className="mt-3 space-y-3">{visibleOtherCandidates.map(renderCandidate)}</div>}
                  {otherVisibleCount < filteredOtherCandidates.length ? <button className="mt-4 min-h-11 w-full rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 sm:w-auto" onClick={() => setOtherVisibleCount((count) => count + 2)} type="button">Load more activities</button> : null}
                </section>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <label className="block text-sm font-bold text-gray-900" htmlFor="athleteNote">
            Training note <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <p className="mt-1 text-sm text-gray-600">
            Add any context about why these activities represent this workout. This is separate from each
            activity&apos;s own notes.
          </p>
          <textarea
            className="mt-3 min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            id="athleteNote"
            maxLength={4000}
            name="athleteNote"
          />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="min-h-11 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
            disabled={selectedActivityIds.size === 0}
            type="submit"
          >
            Save and review
          </button>
          <Link className="min-h-11 text-center text-sm font-semibold leading-[2.75rem] text-gray-600 hover:text-gray-900" href={`/dashboard/training/${programId}`}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
