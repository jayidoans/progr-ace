import Link from "next/link";

import { createClaimDraft } from "@/src/features/claims/actions";
import { ActivityEvidenceCard } from "@/src/features/claims/components/activity-evidence-card";
import type { ClaimPrescription } from "@/src/features/claims/queries";
import { formatComponent, formatTrainingDate } from "@/src/features/training/format";
import type { Activity } from "@/src/features/activities/queries";

type ClaimBuilderProps = {
  candidates: Activity[];
  prescription: ClaimPrescription;
  programId: string;
};

export function ClaimBuilder({ candidates, prescription, programId }: ClaimBuilderProps) {
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

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-bold">Select activity evidence</h2>
          <p className="mt-2 text-sm text-gray-600">
            Activities nearest the scheduled date appear first. You may choose one or more of your
            available activities; date, sport, and target differences are reviewed in a later milestone.
          </p>
          {candidates.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              No available activity evidence. Activities already used in another claim are excluded.
              <Link className="ml-1 font-semibold text-indigo-700" href="/dashboard/activities/new">
                Add an activity
              </Link>
              .
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {candidates.map((activity) => (
                <ActivityEvidenceCard
                  activity={activity}
                  control={
                    <input
                      aria-label={`Select ${activity.name}`}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600"
                      name="activityIds"
                      type="checkbox"
                      value={activity.id}
                    />
                  }
                  key={activity.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <label className="block text-sm font-bold text-gray-900" htmlFor="athleteNote">
            Claim note <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <p className="mt-1 text-sm text-gray-600">
            Explain why these activities relate to this prescription. This is separate from each
            activity&apos;s own note.
          </p>
          <textarea
            className="mt-3 min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            id="athleteNote"
            maxLength={4000}
            name="athleteNote"
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={candidates.length === 0}
            type="submit"
          >
            Save draft and review
          </button>
          <Link className="text-sm font-semibold text-gray-600 hover:text-gray-900" href={`/dashboard/training/${programId}`}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
