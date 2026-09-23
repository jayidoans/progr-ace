import { ActiveRaceGoalCard } from "@/src/features/race-goals/components/active-race-goal-card";
import { CreateRaceForm } from "@/src/features/race-goals/components/create-race-form";
import { RaceGoalForm } from "@/src/features/race-goals/components/race-goal-form";
import { RaceGoalHistory } from "@/src/features/race-goals/components/race-goal-history";
import { getRaceGoalPageData } from "@/src/features/race-goals/queries";
import { RaceResultCard } from "@/src/features/race-results/components/race-result-card";
import { utcDateString } from "@/src/features/validation/engine/compliance";

const messages: Record<string, string> = {
  "race-created": "Race created. You can now set it as your target.",
  "goal-set": "Your active race goal has been set.",
  "goal-updated": "Your race goal planning details were updated.",
  "goal-cancelled": "The race goal was cancelled and preserved in history.",
};

const errors: Record<string, string> = {
  "invalid-race": "Check the race name, date, distance, and location.",
  "race-exists": "That race edition and distance already exists.",
  "race-create-failed": "The race could not be created. Please try again.",
  "race-create-forbidden": "Only an Admin or Coach may add shared race records.",
  "invalid-goal": "Choose a race and enter the target time as HH:MM:SS.",
  "goal-switch-failed": "The active race goal could not be changed. Please try again.",
  "goal-update-failed": "The active race goal could not be updated.",
  "goal-close-failed": "The active race goal could not be closed.",
};

type RaceGoalsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    raceId?: string;
  }>;
};

export default async function RaceGoalsPage({ searchParams }: RaceGoalsPageProps) {
  const [data, params] = await Promise.all([getRaceGoalPageData(), searchParams]);
  const selectedRaceId = data.races.some((race) => race.id === params.raceId)
    ? params.raceId
    : undefined;
  const message = params.message ? messages[params.message] : undefined;
  const error = params.error ? errors[params.error] : undefined;
  const resultByGoal = new Map(data.raceResults.map((result) => [result.athleteRaceGoalId, result]));
  const today = utcDateString();
  const resultGoals = [data.activeGoal, ...data.history].filter(
    (goal): goal is NonNullable<typeof goal> => goal !== null,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Race goals</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">What are you preparing for?</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Set the race you are training for and keep your preparation focused on the goal ahead.
        </p>
      </header>

      {message ? (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ActiveRaceGoalCard goal={data.activeGoal} />
      {resultGoals.length > 0 ? <section className="space-y-5"><div><h2 className="text-xl font-bold text-gray-950">Race Day results</h2><p className="mt-1 text-sm text-gray-600">Record the factual outcome separately from your Race Goal and Training Progress.</p></div>{resultGoals.map((goal) => <RaceResultCard goalId={goal.id} key={goal.id} raceDate={goal.race.event_date} raceDistanceM={goal.race.distance_m} raceGoalStatus={goal.status} raceName={goal.race.name} targetFinishTimeSec={goal.target_finish_time_sec} result={resultByGoal.get(goal.id) ?? null} canRecord={goal.status !== "CANCELLED" && today >= goal.race.event_date} />)}</section> : null}
      <RaceGoalForm
        activeGoal={data.activeGoal}
        races={data.races}
        selectedRaceId={selectedRaceId}
      />
      {data.canManageRaces ? <CreateRaceForm /> : null}
      <RaceGoalHistory goals={data.history} />
    </div>
  );
}
