import Link from "next/link";

import {
  formatDistanceKilometers,
  formatDistanceName,
  formatDuration,
  formatPace,
  formatRaceDate,
} from "@/src/features/race-goals/format";
import type { RaceGoalWithRace } from "@/src/features/race-goals/queries";

type ActiveRaceGoalCardProps = {
  goal: RaceGoalWithRace | null;
};

export function ActiveRaceGoalCard({ goal }: ActiveRaceGoalCardProps) {
  if (!goal) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          Active race goal
        </p>
        <h2 className="mt-2 text-xl font-bold text-gray-950">No target race yet</h2>
        <p className="mt-2 text-sm text-gray-600">
          Choose the event you are preparing for and set a target finish time.
        </p>
        <Link
          className="mt-5 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          href="/dashboard/race-goals"
        >
          Set a race goal
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Target race
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-950">{goal.race.name}</h2>
          {goal.race.location ? (
            <p className="mt-1 text-sm text-gray-600">{goal.race.location}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          ACTIVE
        </span>
      </div>

      <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Distance</dt>
          <dd className="mt-1 font-semibold text-gray-950">
            {formatDistanceName(goal.race.distance_m)}
          </dd>
          <dd className="text-sm text-gray-600">{formatDistanceKilometers(goal.race.distance_m)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Race date</dt>
          <dd className="mt-1 font-semibold text-gray-950">{formatRaceDate(goal.race.event_date)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target finish</dt>
          <dd className="mt-1 font-semibold text-gray-950">
            {formatDuration(goal.target_finish_time_sec)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target pace</dt>
          <dd className="mt-1 font-semibold text-gray-950">
            {formatPace(goal.race.distance_m, goal.target_finish_time_sec)}
          </dd>
          <dd className="text-sm text-gray-600">Derived, not stored</dd>
        </div>
      </dl>

      <Link
        className="mt-6 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-500"
        href="/dashboard/race-goals"
      >
        Manage race goal →
      </Link>
    </section>
  );
}
