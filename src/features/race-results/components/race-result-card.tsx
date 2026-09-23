import Link from "next/link";

import type { RaceResultContext } from "@/src/features/race-results/domain";
import { targetDifferenceSec } from "@/src/features/race-results/domain";
import { formatDifferenceText, formatDurationInput, raceResultStatusLabel } from "@/src/features/race-results/presentation";
import { formatDistanceKilometers, formatRaceDate, formatDuration } from "@/src/features/race-goals/format";
import { RaceResultForm } from "@/src/features/race-results/components/race-result-form";

export function RaceResultCard({ goalId, result, canRecord, raceDate, raceGoalStatus, raceName, raceDistanceM, targetFinishTimeSec, showTrainingProgress, programId }: { goalId: string; result: RaceResultContext | null; canRecord: boolean; raceDate: string; raceGoalStatus: string; raceName: string; raceDistanceM: number; targetFinishTimeSec: number | null; showTrainingProgress?: boolean; programId?: string | null }) {
  const displayRaceDate = result?.raceDate ?? raceDate;
  const displayTarget = result?.targetFinishTimeSec ?? targetFinishTimeSec;
  return <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Race Result</p><p className="mt-1 font-semibold text-gray-950">{raceName}</p><p className="mt-1 text-sm text-gray-600">{formatRaceDate(displayRaceDate)} · {formatDistanceKilometers(result?.raceDistanceM ?? raceDistanceM)}</p><h2 className="mt-3 text-xl font-bold text-gray-950">{result ? raceResultStatusLabel(result.status) : "No race result recorded"}</h2><p className="mt-2 text-sm text-gray-600">{result ? "Recorded manually for Race Day." : raceGoalStatus === "CANCELLED" ? "A cancelled Race Goal cannot receive a new result." : canRecord ? "Record what happened after the race." : "Available after Race Day."}</p></div>{showTrainingProgress && programId ? <Link className="inline-flex min-h-11 items-center rounded-md border border-indigo-300 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" href={`/dashboard/training/${programId}/progress`}>View Training Progress</Link> : null}</div>
    <dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-gray-500">Race Day</dt><dd className="mt-1 font-semibold">{formatRaceDate(displayRaceDate)}</dd></div><div><dt className="text-sm text-gray-500">Target</dt><dd className="mt-1 font-semibold">{displayTarget ? formatDuration(displayTarget) : "—"}</dd></div><div><dt className="text-sm text-gray-500">Actual</dt><dd className="mt-1 font-semibold">{result?.status === "FINISHED" ? formatDurationInput(result.finishTimeSec) || "—" : "—"}</dd></div></dl>
    {result ? <div className="mt-5 rounded-lg border border-gray-200 p-4"><p className="text-sm text-gray-500">Difference</p><p className="mt-1 font-semibold text-gray-950">{formatDifferenceText(targetDifferenceSec(result, result.targetFinishTimeSec))}</p>{result.notes ? <><p className="mt-4 text-sm text-gray-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{result.notes}</p></> : null}</div> : null}
    {canRecord ? <RaceResultEditor goalId={goalId} result={result} /> : null}
  </section>;
}

function RaceResultEditor({ goalId, result }: { goalId: string; result: RaceResultContext | null }) {
  return <details className="mt-6 rounded-lg border border-gray-200 p-4"><summary className="cursor-pointer font-semibold text-indigo-700">{result ? "Edit Race Result" : "How did your race go?"}</summary><RaceResultForm goalId={goalId} existing={result} /></details>;
}
