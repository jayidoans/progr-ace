import { AthleteEvaluationDashboard } from "@/src/features/evaluation/components/athlete-evaluation-dashboard";
import { CoachEvaluationDashboard } from "@/src/features/evaluation/components/coach-evaluation-dashboard";
import { isDemoDeployment } from "@/src/features/demo/server";
import { getEvaluationDashboard } from "@/src/features/evaluation/queries";
import { measureRouteWorkflow } from "@/src/features/performance/diagnostics";
import { getCoachTrainingInsights, getProgramTrainingInsights } from "@/src/features/training-insights/queries";
import { getResearchSurveyStatus } from "@/src/features/research-survey/queries";

export default async function DashboardPage() {
  const demoMode = isDemoDeployment();
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
  const [insights, survey] = await Promise.all([
    data.currentProgram ? getProgramTrainingInsights(data.currentProgram.id, data.today) : Promise.resolve(null),
    getResearchSurveyStatus(),
  ]);
  return (
    <AthleteEvaluationDashboard data={data} insights={insights} readOnly={demoMode} surveyAvailable={survey.isOpen && !survey.submitted} />
  );
}
