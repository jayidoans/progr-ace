import { AthleteEvaluationDashboard } from "@/src/features/evaluation/components/athlete-evaluation-dashboard";
import { CoachEvaluationDashboard } from "@/src/features/evaluation/components/coach-evaluation-dashboard";
import { getEvaluationDashboard } from "@/src/features/evaluation/queries";

export default async function DashboardPage() {
  const data = await getEvaluationDashboard();
  return data.mode === "COACH" ? (
    <CoachEvaluationDashboard data={data} />
  ) : (
    <AthleteEvaluationDashboard data={data} />
  );
}
