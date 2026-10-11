import { AthleteEvaluationDashboard } from "@/src/features/evaluation/components/athlete-evaluation-dashboard";
import { CoachEvaluationDashboard } from "@/src/features/evaluation/components/coach-evaluation-dashboard";
import { getEvaluationDashboard } from "@/src/features/evaluation/queries";
import { measureRouteWorkflow } from "@/src/features/performance/diagnostics";
import { getCoachTrainingInsights, getProgramTrainingInsights } from "@/src/features/training-insights/queries";

export default async function DashboardPage() {
  const data = await measureRouteWorkflow(
    { route: "dashboard", workflow: "evaluation.dashboard", operation: "route" },
    () => getEvaluationDashboard(),
    (result) => result.mode === "COACH"
      ? { programs: result.programs.length, athletes: result.athletes.length }
      : {
          programs: result.currentProgram ? 1 : 0,
          weeks: result.currentWeek ? 1 : 0,
          claims: result.recentValidations.length,
        },
  );
  if (data.mode === "COACH") {
    const insights = await getCoachTrainingInsights(data.today);
    return <CoachEvaluationDashboard data={data} insights={insights} />;
  }

  // Keep the existing dashboard's current-program selection authoritative, then
  // load exactly one bounded insight projection for the Athlete presentation.
  const insights = data.currentProgram
    ? await getProgramTrainingInsights(data.currentProgram.id, data.today)
    : null;
  return (
    <AthleteEvaluationDashboard data={data} insights={insights} />
  );
}
