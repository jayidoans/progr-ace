import { AthleteEvaluationDashboard } from "@/src/features/evaluation/components/athlete-evaluation-dashboard";
import { CoachEvaluationDashboard } from "@/src/features/evaluation/components/coach-evaluation-dashboard";
import { getEvaluationDashboard } from "@/src/features/evaluation/queries";
import { measureRouteWorkflow } from "@/src/features/performance/diagnostics";

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
  return data.mode === "COACH" ? (
    <CoachEvaluationDashboard data={data} />
  ) : (
    <AthleteEvaluationDashboard data={data} />
  );
}
