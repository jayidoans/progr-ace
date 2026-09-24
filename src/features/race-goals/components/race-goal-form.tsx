import {
  closeRaceGoal,
  setActiveRaceGoal,
  updateActiveRaceGoal,
} from "@/src/features/race-goals/actions";
import {
  formatDistanceKilometers,
  formatDistanceName,
  formatRaceDate,
} from "@/src/features/race-goals/format";
import type { Race, RaceGoalWithRace } from "@/src/features/race-goals/queries";
import { FieldHelp } from "@/src/features/ui/field-help";

const inputClassName =
  "mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

function DurationFields({ totalSeconds = 0 }: { totalSeconds?: number }) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div>
      <span className="block text-sm font-medium text-gray-800">Target finish <FieldHelp label="Target finish">The finish time the athlete is aiming for on race day.</FieldHelp></span>
      <div className="mt-2 grid grid-cols-3 gap-3">
        <label className="text-xs font-medium text-gray-600">
          Hours
          <input className={inputClassName} defaultValue={hours} inputMode="numeric" max={999} min={0} name="targetFinishHours" required step={1} type="number" />
        </label>
        <label className="text-xs font-medium text-gray-600">
          Minutes
          <input className={inputClassName} defaultValue={minutes} inputMode="numeric" max={59} min={0} name="targetFinishMinutes" required step={1} type="number" />
        </label>
        <label className="text-xs font-medium text-gray-600">
          Seconds
          <input className={inputClassName} defaultValue={seconds} inputMode="numeric" max={59} min={0} name="targetFinishSeconds" required step={1} type="number" />
        </label>
      </div>
      <span className="mt-1 block text-xs text-gray-500">Enter the target finish as hours, minutes, and seconds.</span>
    </div>
  );
}

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
            <span className="mt-1 block text-xs font-normal text-gray-500">Select the event this training plan will support.</span>
          </label>

          <DurationFields />

          <label className="block text-sm font-medium text-gray-800">
            Notes (optional)
            <textarea className={inputClassName} maxLength={2000} name="notes" placeholder="Add optional context for your coach..." rows={4} />
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
              <DurationFields totalSeconds={activeGoal.target_finish_time_sec} />
              <label className="block text-sm font-medium text-gray-800">
                Notes (optional)
                <textarea
                  className={inputClassName}
                  defaultValue={activeGoal.notes ?? ""}
                  maxLength={2000}
                  name="notes"
                  placeholder="Add optional context for your coach..."
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
                <input name="status" type="hidden" value="CANCELLED" />
                <button
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  type="submit"
                >
                  Cancel goal
                </button>
              </form>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              After race day, your Coach can review and close this goal. Your training history will remain available.
            </p>
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
