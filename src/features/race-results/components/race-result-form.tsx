"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createRaceResult, updateRaceResult } from "@/src/features/race-results/actions";
import type { RaceResultContext, RaceResultStatus } from "@/src/features/race-results/domain";
import { formatDurationInput, parseDurationInput, raceResultStatusLabel } from "@/src/features/race-results/presentation";

const inputClass = "mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export function RaceResultForm({ goalId, existing, onCancel }: { goalId: string; existing?: RaceResultContext | null; onCancel?: () => void }) {
  const [status, setStatus] = useState<RaceResultStatus>(existing?.status ?? "FINISHED");
  const [duration, setDuration] = useState(formatDurationInput(existing?.finishTimeSec ?? null));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finishTimeSec = status === "FINISHED" ? parseDurationInput(duration) : null;
    if (status === "FINISHED" && finishTimeSec === null) {
      setError("Enter a valid finish time as HH:MM:SS.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (existing) await updateRaceResult(existing.id, { status, finishTimeSec, notes });
        else await createRaceResult(goalId, { status, finishTimeSec, notes });
        onCancel?.();
        router.refresh();
      } catch (actionError) {
        const message = actionError instanceof Error ? actionError.message : "The race result could not be saved.";
        setError(message.includes("before race day") ? "Race Result is available on or after Race Day." : message.includes("already exists") ? "A Race Result already exists for this goal. Refresh and review it." : "The Race Result could not be saved. Check your details and access.");
      }
    });
  }

  return <form className="mt-5 space-y-5" onSubmit={submit}>
    <fieldset><legend className="text-sm font-medium text-gray-800">Outcome</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{(["FINISHED", "DNF", "DNS"] as const).map((option) => <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${status === option ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-gray-300 text-gray-700"}`} key={option}><input checked={status === option} className="accent-indigo-600" name="status" onChange={() => { setStatus(option); if (option !== "FINISHED") setDuration(""); }} type="radio" value={option} />{raceResultStatusLabel(option)}</label>)}</div></fieldset>
    {status === "FINISHED" ? <label className="block text-sm font-medium text-gray-800">Finish Time (HH:MM:SS)<input aria-describedby="finish-time-help" aria-invalid={Boolean(error)} className={inputClass} inputMode="numeric" onChange={(event) => setDuration(event.target.value)} pattern="[0-9]{1,3}:[0-9]{2}:[0-9]{2}" placeholder="03:51:27" required value={duration} /><span className="mt-1 block text-xs font-normal text-gray-500" id="finish-time-help">Enter the race duration, not a clock time.</span></label> : null}
    <label className="block text-sm font-medium text-gray-800">Notes (optional)<textarea className={inputClass} maxLength={2000} onChange={(event) => setNotes(event.target.value)} rows={4} value={notes} /></label>
    {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
    <div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300" disabled={pending} type="submit">{pending ? "Saving…" : existing ? "Save Race Result" : "Record Race Result"}</button>{onCancel ? <button className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" disabled={pending} onClick={onCancel} type="button">Cancel</button> : null}</div>
  </form>;
}
