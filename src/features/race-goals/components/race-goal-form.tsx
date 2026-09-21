import {
  closeRaceGoal,
  setActiveRaceGoal,
  updateActiveRaceGoal,
} from "@/src/features/race-goals/actions";
import {
  formatDistanceKilometers,
  formatDistanceName,
  formatDuration,
  formatRaceDate,
} from "@/src/features/race-goals/format";
import type { Race, RaceGoalWithRace } from "@/src/features/race-goals/queries";

const inputClassName =
  "mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

type RaceGoalFormProps = {
  activeGoal: RaceGoalWithRace | null;
  races: Race[];
  selectedRaceId?: string;
};

export function RaceGoalForm({ activeGoal, races, selectedRaceId }: RaceGoalFormProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-bold text-gray-950">
          {activeGoal ? "Replace target race" : "Set target race"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Choose a race and target time to guide your training toward race day.
        </p>

        <form action={setActiveRaceGoal} className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-gray-800">
            Race
            <select
              className={inputClassName}
              defaultValue={selectedRaceId ?? ""}
              disabled={races.length === 0}
              name="raceId"
              required
            >
              <option disabled value="">
                Select a race
              </option>
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name} — {formatDistanceName(race.distance_m)} ({formatRaceDate(race.event_date)})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-gray-800">
            Target finish (HH:MM:SS)
            <input
              className={inputClassName}
              inputMode="numeric"
              name="targetFinishTime"
              pattern="\d{1,3}:[0-5]\d:[0-5]\d"
              placeholder="01:59:00"
              required
              type="text"
            />
          </label>

          <label className="block text-sm font-medium text-gray-800">
            Notes (optional)
            <textarea className={inputClassName} maxLength={2000} name="notes" rows={4} />
          </label>

          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={races.length === 0}
            type="submit"
          >
            {activeGoal ? "Replace active goal" : "Set active goal"}
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-bold text-gray-950">Update active goal</h2>
        {activeGoal ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              {activeGoal.race.name} · {formatDistanceKilometers(activeGoal.race.distance_m)}
            </p>
            <form action={updateActiveRaceGoal} className="mt-6 space-y-5">
              <input name="goalId" type="hidden" value={activeGoal.id} />
              <label className="block text-sm font-medium text-gray-800">
                Target finish (HH:MM:SS)
                <input
                  className={inputClassName}
                  defaultValue={formatDuration(activeGoal.target_finish_time_sec)}
                  inputMode="numeric"
                  name="targetFinishTime"
                  pattern="\d{1,3}:[0-5]\d:[0-5]\d"
                  required
                  type="text"
                />
              </label>
              <label className="block text-sm font-medium text-gray-800">
                Notes (optional)
                <textarea
                  className={inputClassName}
                  defaultValue={activeGoal.notes ?? ""}
                  maxLength={2000}
                  name="notes"
                  rows={4}
                />
              </label>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                type="submit"
              >
                Save planning details
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6">
              <form action={closeRaceGoal}>
                <input name="goalId" type="hidden" value={activeGoal.id} />
                <input name="status" type="hidden" value="COMPLETED" />
                <button
                  className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  type="submit"
                >
                  Mark completed
                </button>
              </form>
              <form action={closeRaceGoal}>
                <input name="goalId" type="hidden" value={activeGoal.id} />
                <input name="status" type="hidden" value="CANCELLED" />
                <button
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  type="submit"
                >
                  Cancel goal
                </button>
              </form>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            There is no active goal to update. Select a race to begin.
          </p>
        )}
      </section>
    </div>
  );
}
