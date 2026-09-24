"use client";

import { useState } from "react";

import {
  createWeeklyTrainingSession,
  deleteWeeklyTrainingSession,
  extendTrainingProgramAndStartNextWeek,
  publishWeeklyTrainingPlan,
  startWeeklyTrainingPlan,
  updateWeeklyTrainingSession,
} from "@/src/features/training/actions";
import { TRAINING_MENUS, WORKOUT_TYPES } from "@/src/features/training-import/template";
import type { PrescriptionWithComponents, TrainingScheduleWeek } from "@/src/features/training/queries";
import { FieldHelp } from "@/src/features/ui/field-help";

const input =
  "mt-1.5 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

type ComponentDraft = {
  componentType: string;
  targetDistanceM: string;
  targetDurationSec: string;
  repetitions: string;
  distancePerRepM: string;
  recoveryDurationSec: string;
  targetPaceMinSecPerKm: string;
  targetPaceMaxSecPerKm: string;
  instruction: string;
};

const emptyComponent = (): ComponentDraft => ({
  componentType: "EASY",
  targetDistanceM: "",
  targetDurationSec: "",
  repetitions: "",
  distancePerRepM: "",
  recoveryDurationSec: "",
  targetPaceMinSecPerKm: "",
  targetPaceMaxSecPerKm: "",
  instruction: "",
});

function componentDrafts(prescription?: PrescriptionWithComponents) {
  if (!prescription) return [emptyComponent()];
  return prescription.components.map((component) => ({
    componentType: component.component_type,
    targetDistanceM: component.target_distance_m?.toString() ?? "",
    targetDurationSec: component.target_duration_sec?.toString() ?? "",
    repetitions: component.repetitions?.toString() ?? "",
    distancePerRepM: component.distance_per_rep_m?.toString() ?? "",
    recoveryDurationSec: component.recovery_duration_sec?.toString() ?? "",
    targetPaceMinSecPerKm: component.target_pace_min_sec_per_km?.toString() ?? "",
    targetPaceMaxSecPerKm: component.target_pace_max_sec_per_km?.toString() ?? "",
    instruction: component.instruction ?? "",
  }));
}

function componentPayload(components: ComponentDraft[]) {
  const numberOrNull = (value: string) => value === "" ? null : Number(value);
  return JSON.stringify(components.map((component) => ({
    componentType: component.componentType,
    targetDistanceM: numberOrNull(component.targetDistanceM),
    targetDurationSec: numberOrNull(component.targetDurationSec),
    repetitions: numberOrNull(component.repetitions),
    distancePerRepM: numberOrNull(component.distancePerRepM),
    recoveryDurationSec: numberOrNull(component.recoveryDurationSec),
    targetPaceMinSecPerKm: numberOrNull(component.targetPaceMinSecPerKm),
    targetPaceMaxSecPerKm: numberOrNull(component.targetPaceMaxSecPerKm),
    instruction: component.instruction || null,
  })));
}

function SessionForm({
  programId,
  week,
  prescription,
}: {
  programId: string;
  week: TrainingScheduleWeek;
  prescription?: PrescriptionWithComponents;
}) {
  const [components, setComponents] = useState(() => componentDrafts(prescription));
  const action = prescription ? updateWeeklyTrainingSession : createWeeklyTrainingSession;
  const updateComponent = (index: number, field: keyof ComponentDraft, value: string) => {
    setComponents((current) => current.map((component, itemIndex) =>
      itemIndex === index ? { ...component, [field]: value } : component,
    ));
  };

  return (
    <form action={action} className="space-y-5 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
      <input name="programId" type="hidden" value={programId} />
      {prescription ? (
        <input name="prescriptionId" type="hidden" value={prescription.id} />
      ) : (
        <input name="weekId" type="hidden" value={week.id} />
      )}
      <input name="components" type="hidden" value={componentPayload(components)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-800">
          Date
          <input className={input} defaultValue={prescription?.scheduled_date ?? week.start_date} max={week.end_date} min={week.start_date} name="scheduledDate" required type="date" />
        </label>
        <label className="text-sm font-medium text-gray-800">
          Training menu <FieldHelp label="Training menu">The main training category used to organize this session.</FieldHelp>
          <select className={input} defaultValue={prescription?.training_menu ?? "EASY"} name="trainingMenu" required>
            {TRAINING_MENUS.map((menu) => <option key={menu}>{menu}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-800 sm:col-span-2">
          Title
          <input className={input} defaultValue={prescription?.title ?? ""} maxLength={160} name="title" placeholder="Easy Run" required />
        </label>
        <label className="text-sm font-medium text-gray-800 sm:col-span-2">
          Description
          <textarea className={input} defaultValue={prescription?.description ?? ""} maxLength={2000} name="description" placeholder="Add optional coaching notes for this session..." rows={3} />
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-gray-950">Workout details</h4>
          <p className="mt-1 text-sm text-gray-600">Add components in the order the athlete should complete them.</p>
        </div>
        {components.map((component, index) => (
          <fieldset className="space-y-4 rounded-lg border border-gray-200 bg-white p-4" key={index}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="font-semibold text-gray-950">Component {index + 1}</legend>
              {components.length > 1 ? (
                <button className="min-h-11 rounded-md px-3 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => setComponents((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-gray-800">
                Workout type <FieldHelp label="Workout type">The type of effort or activity for this part of the session.</FieldHelp>
                <select className={input} onChange={(event) => updateComponent(index, "componentType", event.target.value)} value={component.componentType}>
                  {WORKOUT_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              {([
                ["targetDistanceM", "Target distance (m)", "The distance for this component, entered in metres."],
                ["targetDurationSec", "Target duration (sec)", "The duration for this component, entered in seconds."],
                ["repetitions", "Repetitions", "How many times the athlete repeats this workout component."],
                ["distancePerRepM", "Distance per rep (m)", "The distance for each repetition, entered in metres."],
                ["recoveryDurationSec", "Recovery (sec)", "The recovery time between repetitions, entered in seconds."],
                ["targetPaceMinSecPerKm", "Pace min (sec/km)", "The slower end of the pace range, entered as seconds per kilometre."],
                ["targetPaceMaxSecPerKm", "Pace max (sec/km)", "The faster end of the pace range, entered as seconds per kilometre."],
              ] as const).map(([field, label, help]) => (
                <label className="text-sm font-medium text-gray-800" key={field}>
                  {label} {help ? <FieldHelp label={label}>{help}</FieldHelp> : null}
                  <input className={input} min={1} onChange={(event) => updateComponent(index, field, event.target.value)} placeholder="Optional" type="number" value={component[field]} />
                </label>
              ))}
              <label className="text-sm font-medium text-gray-800 sm:col-span-2 lg:col-span-3">
                Instruction
                <textarea className={input} maxLength={2000} onChange={(event) => updateComponent(index, "instruction", event.target.value)} placeholder="Add optional instructions for the athlete..." rows={2} value={component.instruction} />
              </label>
            </div>
          </fieldset>
        ))}
        <button className="min-h-11 w-full rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 sm:w-auto" disabled={components.length >= 20} onClick={() => setComponents((current) => [...current, emptyComponent()])} type="button">
          + Add Component
        </button>
      </div>

      <button className="min-h-11 w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 sm:w-auto" type="submit">
        {prescription ? "Save Training Session" : "Add Training Session"}
      </button>
    </form>
  );
}

export function UnplannedWeekPlanner({ programId, week }: { programId: string; week: TrainingScheduleWeek }) {
  return (
    <div className="mt-4 rounded-lg bg-gray-50 px-4 py-5">
      <p className="text-sm text-gray-600">No training sessions have been planned for this week yet.</p>
      <form action={startWeeklyTrainingPlan} className="mt-4">
        <input name="programId" type="hidden" value={programId} />
        <input name="weekDate" type="hidden" value={week.start_date} />
        <button className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500" type="submit">
          Plan This Week
        </button>
      </form>
    </div>
  );
}

export function AddAnotherWeekPlanner({ programId, week }: { programId: string; week: TrainingScheduleWeek }) {
  return (
    <div className="mt-5 border-t border-gray-200 pt-5">
      <p className="text-sm text-gray-600">Continue planning with Week {week.week_number}.</p>
      <form action={startWeeklyTrainingPlan} className="mt-3">
        <input name="programId" type="hidden" value={programId} />
        <input name="weekDate" type="hidden" value={week.start_date} />
        <input name="showNextWeek" type="hidden" value="true" />
        <button className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500" type="submit">
          Add Another Week
        </button>
      </form>
    </div>
  );
}

export function ExtendProgramPlanner({ programId }: { programId: string }) {
  return (
    <details className="mt-5 border-t border-gray-200 pt-5">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-blue-700">Add Another Week</summary>
      <p className="mt-2 text-sm text-gray-600">This extends the program through Race Day and creates the next week as a draft. Published training already in the schedule will not change.</p>
      <form action={extendTrainingProgramAndStartNextWeek} className="mt-4">
        <input name="programId" type="hidden" value={programId} />
        <button className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500" type="submit">Extend to Race Day and Add Week</button>
      </form>
    </details>
  );
}

export function DraftWeekPlanner({ programId, week }: { programId: string; week: TrainingScheduleWeek }) {
  return (
    <div className="mt-5 space-y-5 border-t border-gray-200 pt-5">
      <div>
        <h3 className="font-bold text-gray-950">Draft weekly plan</h3>
        <p className="mt-1 text-sm text-gray-600">This week&apos;s training plan is being prepared and is not visible to the Athlete yet.</p>
      </div>

      {week.prescriptions.map((prescription) => (
        <details className="rounded-lg border border-gray-200 bg-white" key={prescription.id}>
          <summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold text-gray-950">
            Edit {prescription.scheduled_date} · {prescription.title}
          </summary>
          <div className="space-y-4 border-t border-gray-200 p-4">
            <SessionForm prescription={prescription} programId={programId} week={week} />
            <details className="rounded-lg border border-red-200 bg-red-50 p-4">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold text-red-700">Delete session</summary>
              <p className="mt-2 text-sm text-red-700">Delete this training session? This session and its workout details will be removed from the draft week.</p>
              <form action={deleteWeeklyTrainingSession} className="mt-4">
                <input name="programId" type="hidden" value={programId} />
                <input name="prescriptionId" type="hidden" value={prescription.id} />
                <button className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500" type="submit">Confirm Delete</button>
              </form>
            </details>
          </div>
        </details>
      ))}

      <details className="rounded-lg border border-blue-200 bg-white" open={week.prescriptions.length === 0}>
        <summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold text-blue-700">+ Add Training Session</summary>
        <div className="border-t border-blue-100 p-4"><SessionForm programId={programId} week={week} /></div>
      </details>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        {week.prescriptions.length === 0 ? (
          <p className="text-sm text-gray-600">Add at least one training session before publishing this week.</p>
        ) : null}
        <form action={publishWeeklyTrainingPlan} className={week.prescriptions.length === 0 ? "mt-3" : ""}>
          <input name="programId" type="hidden" value={programId} />
          <input name="weekId" type="hidden" value={week.id} />
          <button className="min-h-11 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto" disabled={week.prescriptions.length === 0} type="submit">
            Publish Week
          </button>
        </form>
      </div>
    </div>
  );
}
