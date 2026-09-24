import {
  addPrescriptionComponent,
  addTrainingPrescription,
  addTrainingWeek,
  createTrainingProgram,
  publishTrainingProgram,
} from "@/src/features/training/actions";
import { TRAINING_MENUS, WORKOUT_TYPES } from "@/src/features/training-import/template";
import { FieldHelp } from "@/src/features/ui/field-help";
import type {
  ProgramRaceGoal,
  TrainingProgramDetail,
} from "@/src/features/training/queries";

const input =
  "mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export function ProgramForm({ raceGoals, selectedRaceGoalId }: { raceGoals: ProgramRaceGoal[]; selectedRaceGoalId?: string }) {
  return (
    <form action={createTrainingProgram} className="mt-8 grid gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:grid-cols-2">
      <label className="block text-sm font-medium text-gray-800 sm:col-span-2">
        Athlete race goal
        <select className={input} defaultValue={selectedRaceGoalId ?? ""} name="raceGoalId" required>
          <option value="">Select a race goal</option>
          {raceGoals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.athlete.full_name ?? goal.athlete.email ?? "Athlete"} — {goal.race.name} · Race day {goal.race.event_date}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-normal text-gray-500">The race day sets the program&apos;s final date.</span>
      </label>
      <label className="block text-sm font-medium text-gray-800 sm:col-span-2">
        Program name
        <input className={input} maxLength={160} name="name" placeholder="e.g. Jakarta Marathon Preparation" required />
      </label>
      <label className="block text-sm font-medium text-gray-800 sm:col-span-2">
        Start date
        <input className={input} name="startDate" required type="date" />
      </label>
      <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:col-span-2">The program ends on the selected Race Goal&apos;s race day, so you can plan week by week until the event.</p>
      <label className="block text-sm font-medium text-gray-800 sm:col-span-2">
        Description
        <textarea className={input} maxLength={2000} name="description" placeholder="Add optional coaching context for this program..." rows={4} />
      </label>
      <button className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 sm:col-span-2" type="submit">
        Create draft program to race day
      </button>
    </form>
  );
}

export function WeekForm({ programId }: { programId: string }) {
  return (
    <form action={addTrainingWeek} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <input name="programId" type="hidden" value={programId} />
      <label className="text-sm font-medium text-gray-800">Week number<input className={input} min={1} name="weekNumber" required type="number" /></label>
      <label className="text-sm font-medium text-gray-800">Phase<input className={input} name="phase" placeholder="e.g. Build" required /></label>
      <label className="text-sm font-medium text-gray-800">Monday<input className={input} name="startDate" required type="date" /></label>
      <label className="text-sm font-medium text-gray-800">Sunday<input className={input} name="endDate" required type="date" /></label>
      <button className="self-end rounded-md border border-indigo-600 px-4 py-2 font-semibold text-indigo-700 hover:bg-indigo-50" type="submit">Add week</button>
    </form>
  );
}

const optionalNumberFields = [
  ["targetDistanceM", "Target distance (m)"],
  ["targetDurationSec", "Target duration (sec)"],
  ["repetitions", "Repetitions"],
  ["distancePerRepM", "Distance per rep (m)"],
  ["recoveryDurationSec", "Recovery (sec)"],
  ["targetPaceMinSecPerKm", "Pace min (sec/km)"],
  ["targetPaceMaxSecPerKm", "Pace max (sec/km)"],
] as const;

const componentHelp = {
  targetDistanceM: "The distance for this part of the workout, entered in metres.",
  targetDurationSec: "The duration for this part of the workout, entered in seconds.",
  repetitions: "How many times the athlete repeats this workout component.",
  distancePerRepM: "The distance for each repetition, entered in metres.",
  recoveryDurationSec: "The recovery time between repetitions, entered in seconds.",
  targetPaceMinSecPerKm: "The slower end of the target pace range, entered as seconds per kilometre.",
  targetPaceMaxSecPerKm: "The faster end of the target pace range, entered as seconds per kilometre.",
} as const;

function ComponentFields() {
  return (
    <>
      <label className="text-sm font-medium text-gray-800">Workout type <FieldHelp label="Workout type">The type of effort or activity for this part of the session.</FieldHelp><select className={input} name="componentType" required>{WORKOUT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="text-sm font-medium text-gray-800">Component order<input className={input} defaultValue={1} min={1} name="sequenceOrder" required type="number" /></label>
      {optionalNumberFields.map(([name, label]) => (
        <label className="text-sm font-medium text-gray-800" key={name}>{label} <FieldHelp label={label}>{componentHelp[name]}</FieldHelp><input className={input} min={1} name={name} placeholder="Optional" type="number" /></label>
      ))}
      <label className="text-sm font-medium text-gray-800 sm:col-span-2">Instruction<textarea className={input} maxLength={2000} name="instruction" placeholder="Add optional instructions for the athlete..." rows={2} /></label>
    </>
  );
}

export function PrescriptionForm({ program }: { program: TrainingProgramDetail }) {
  return (
    <form action={addTrainingPrescription} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <input name="programId" type="hidden" value={program.id} />
      <label className="text-sm font-medium text-gray-800">Week<select className={input} name="trainingWeekId" required><option value="">Select week</option>{program.weeks.map((week) => <option key={week.id} value={week.id}>Week {week.week_number} — {week.phase}</option>)}</select></label>
      <label className="text-sm font-medium text-gray-800">Training day<input className={input} name="scheduledDate" required type="date" /></label>
      <label className="text-sm font-medium text-gray-800">Training menu <FieldHelp label="Training menu">The main training category used to organize this session.</FieldHelp><select className={input} name="trainingMenu" required>{TRAINING_MENUS.map((menu) => <option key={menu}>{menu}</option>)}</select></label>
      <label className="text-sm font-medium text-gray-800 sm:col-span-2">Title<input className={input} name="title" placeholder="e.g. Speed session" required /></label>
      <label className="text-sm font-medium text-gray-800">Description<input className={input} name="description" placeholder="Optional session summary" /></label>
      <ComponentFields />
      <button className="rounded-md border border-indigo-600 px-4 py-2 font-semibold text-indigo-700 hover:bg-indigo-50 sm:col-span-2 lg:col-span-3" disabled={program.weeks.length === 0} type="submit">Add prescription and first component</button>
    </form>
  );
}

export function ComponentForm({ program }: { program: TrainingProgramDetail }) {
  const prescriptions = program.weeks.flatMap((week) => week.prescriptions);
  return (
    <form action={addPrescriptionComponent} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <input name="programId" type="hidden" value={program.id} />
      <label className="text-sm font-medium text-gray-800 sm:col-span-2 lg:col-span-3">Prescription<select className={input} name="prescriptionId" required><option value="">Select prescription</option>{prescriptions.map((item) => <option key={item.id} value={item.id}>{item.scheduled_date} — {item.title}</option>)}</select></label>
      <ComponentFields />
      <button className="rounded-md border border-indigo-600 px-4 py-2 font-semibold text-indigo-700 hover:bg-indigo-50 sm:col-span-2 lg:col-span-3" disabled={prescriptions.length === 0} type="submit">Add component</button>
    </form>
  );
}

export function PublishProgramForm({ programId }: { programId: string }) {
  return (
    <form action={publishTrainingProgram}>
      <input name="programId" type="hidden" value={programId} />
      <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500" type="submit">Publish program</button>
    </form>
  );
}
