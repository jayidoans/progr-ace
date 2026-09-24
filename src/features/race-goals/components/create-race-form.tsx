import { createRace } from "@/src/features/race-goals/actions";
import { FieldHelp } from "@/src/features/ui/field-help";

const inputClassName =
  "mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export function CreateRaceForm() {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-xl font-bold text-gray-950">Create a race</h2>
      <p className="mt-2 text-sm text-gray-600">
        Add an event and distance when it is not already available in the race list.
      </p>

      <form action={createRace} className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-800 sm:col-span-2">
          Race name
          <input className={inputClassName} maxLength={160} name="name" placeholder="e.g. Jakarta Marathon 2026" required type="text" />
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Event date <FieldHelp label="Event date">The scheduled race day. It keeps the training program focused on the correct date.</FieldHelp>
          <input className={inputClassName} name="eventDate" required type="date" />
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Distance (km) <FieldHelp label="Race distance">Enter the official race distance in kilometres.</FieldHelp>
          <input
            className={inputClassName}
            inputMode="decimal"
            min="0.001"
            name="distanceKm"
            placeholder="e.g. 21.0975"
            required
            step="any"
            type="number"
          />
          <span className="mt-1 block text-xs text-gray-500">Enter the distance in kilometers.</span>
        </label>

        <label className="block text-sm font-medium text-gray-800 sm:col-span-2">
          Location (optional)
          <input className={inputClassName} maxLength={160} name="location" placeholder="e.g. Jakarta" type="text" />
        </label>

        <div className="sm:col-span-2">
          <button
            className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            type="submit"
          >
            Create race
          </button>
        </div>
      </form>
    </section>
  );
}
