import {
  formatDistanceName,
  formatDuration,
  formatRaceDate,
} from "@/src/features/race-goals/format";
import type { RaceGoalWithRace } from "@/src/features/race-goals/queries";

type RaceGoalHistoryProps = {
  goals: RaceGoalWithRace[];
};

export function RaceGoalHistory({ goals }: RaceGoalHistoryProps) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-xl font-bold text-gray-950">Previous race goals</h2>
      <p className="mt-2 text-sm text-gray-600">
        Review the races you have completed or moved on from.
      </p>

      {goals.length === 0 ? (
        <p className="mt-6 rounded-md bg-gray-50 px-4 py-5 text-sm text-gray-600">
          Your previous race goals will appear here.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="pb-3 pr-6 font-semibold">Race</th>
                <th className="pb-3 pr-6 font-semibold">Date</th>
                <th className="pb-3 pr-6 font-semibold">Target</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {goals.map((goal) => (
                <tr key={goal.id}>
                  <td className="py-4 pr-6">
                    <span className="font-semibold text-gray-950">{goal.race.name}</span>
                    <span className="block text-gray-500">
                      {formatDistanceName(goal.race.distance_m)}
                    </span>
                  </td>
                  <td className="py-4 pr-6 text-gray-700">{formatRaceDate(goal.race.event_date)}</td>
                  <td className="py-4 pr-6 font-medium text-gray-950">
                    {formatDuration(goal.target_finish_time_sec)}
                  </td>
                  <td className="py-4">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                      {goal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
