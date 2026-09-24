"use client";

import { useRef, useState } from "react";

import { copyTrainingProgram } from "@/src/features/training/actions";
import { trainingProgramStatusLabel } from "@/src/features/training-cancellation/presentation";
import type { CopyableTrainingProgram, ProgramRaceGoal } from "@/src/features/training/queries";

const input = "mt-2 min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export function CopyProgramForm({ program, goals }: { program: CopyableTrainingProgram; goals: ProgramRaceGoal[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [destinationId, setDestinationId] = useState("");
  const destination = goals.find((goal) => goal.id === destinationId);
  const sessions = program.weeks.reduce((total, week) => total + week.prescriptions.length, 0);

  return (
    <form action={copyTrainingProgram} className="rounded-lg border border-gray-200 p-4">
      <input name="sourceProgramId" type="hidden" value={program.id} />
      <p className="font-bold">{program.race_goal.athlete.full_name ?? program.race_goal.athlete.email ?? "Athlete"}</p>
      <p className="mt-1 text-sm text-gray-700">{program.race_goal.race.name} · {program.name}</p>
      <p className="mt-1 text-xs text-gray-500">{trainingProgramStatusLabel(program.status)} · {program.weeks.length} weeks · {sessions} sessions</p>
      <label className="mt-4 block text-sm font-medium text-gray-800">
        Copy to athlete race goal
        <select className={input} name="destinationRaceGoalId" onChange={(event) => setDestinationId(event.target.value)} required value={destinationId}>
          <option value="">Select destination</option>
          {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.athlete.full_name ?? goal.athlete.email ?? "Athlete"} — {goal.race.name}</option>)}
        </select>
        <span className="mt-1 block text-xs font-normal text-gray-500">Dates and workout details are copied without changing the destination athlete&apos;s target pace.</span>
      </label>
      <button className="mt-4 min-h-11 rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 enabled:hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400" disabled={!destinationId} onClick={(event) => { event.preventDefault(); dialogRef.current?.showModal(); }} type="button">Copy program</button>
      <dialog className="max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/40" ref={dialogRef}>
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-bold">Copy training program?</h2>
          <p className="text-sm text-gray-600">Copy <strong>{program.name}</strong> from {program.race_goal.athlete.full_name ?? "the source athlete"} to {destination?.athlete.full_name ?? "the selected athlete"} for {program.race_goal.race.name}.</p>
          <p className="text-sm text-gray-600">The copied program will be a fresh draft. Training history, activities, claims, and results are not copied.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700" onClick={() => dialogRef.current?.close()} type="button">Cancel</button>
            <button className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => dialogRef.current?.close()} type="submit">Copy program</button>
          </div>
        </div>
      </dialog>
    </form>
  );
}
