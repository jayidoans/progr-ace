import { updateStravaActivityContext } from "@/src/features/activities/actions";
import type { Activity } from "@/src/features/activities/queries";
import { FieldHelp } from "@/src/features/ui/field-help";

export function StravaActivityContextForm({ activity }: { activity: Activity }) {
  return (
    <form action={updateStravaActivityContext} className="space-y-5">
      <input name="activityId" type="hidden" value={activity.id} />
      <label className="block text-sm font-semibold text-gray-800">
        RPE (1–10) <FieldHelp label="RPE">Rate how hard the session felt on a scale from 1 to 10.</FieldHelp>
        <input
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal sm:max-w-40"
          defaultValue={activity.rpe ?? ""}
          inputMode="numeric"
          max={10}
          min={1}
          name="rpe"
          type="number"
        />
      </label>
      <label className="block text-sm font-semibold text-gray-800">
        Notes
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          defaultValue={activity.notes ?? ""}
          maxLength={4000}
          name="notes"
          placeholder="Add optional training notes..."
        />
      </label>
      <button
        className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        type="submit"
      >
        Save training notes
      </button>
    </form>
  );
}
