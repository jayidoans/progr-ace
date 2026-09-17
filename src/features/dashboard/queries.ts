import "server-only";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import {
  currentTrainingWeek,
  distanceCompletionPercent,
  summarizeStravaActivities,
  sumTargetDistanceM,
} from "@/src/features/dashboard/weekly-stats";

export type WeeklyStravaStats = {
  weekStartDate: string;
  weekEndDate: string;
  lastSuccessfulSyncAt: string;
  totalActivities: number;
  runningDistanceM: number;
  targetDistanceM: number | null;
  completionPercent: number | null;
};

export async function getWeeklyStravaStats(): Promise<WeeklyStravaStats | null> {
  const { supabase, user } = await requireAuthenticatedSession();
  const { data: connection, error: connectionError } = await supabase
    .from("strava_connections")
    .select("last_successful_sync_at")
    .eq("athlete_id", user.id)
    .maybeSingle();

  if (connectionError) throw new Error("Unable to load dashboard Strava status.");
  if (!connection?.last_successful_sync_at) return null;

  const week = currentTrainingWeek();
  const [activitiesResult, programResult] = await Promise.all([
    supabase
      .from("activities")
      .select("distance_m, sport_type")
      .eq("athlete_id", user.id)
      .eq("source", "STRAVA")
      .gte("started_at", week.startAt)
      .lt("started_at", week.endAt),
    supabase
      .from("training_programs")
      .select("id, race_goal:athlete_race_goals!inner(athlete_id, status)")
      .eq("status", "PUBLISHED")
      .eq("race_goal.athlete_id", user.id)
      .eq("race_goal.status", "ACTIVE")
      .lte("start_date", week.endDate)
      .gte("end_date", week.startDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (activitiesResult.error || programResult.error) {
    throw new Error("Unable to load weekly dashboard statistics.");
  }

  let targetDistanceM: number | null = null;
  if (programResult.data) {
    const { data: trainingWeeks, error: trainingWeeksError } = await supabase
      .from("training_weeks")
      .select(`
        start_date,
        end_date,
        prescriptions:training_prescriptions (
          scheduled_date,
          components:prescription_components (
            target_distance_m,
            repetitions,
            distance_per_rep_m
          )
        )
      `)
      .eq("training_program_id", programResult.data.id)
      .lte("start_date", week.endDate)
      .gte("end_date", week.startDate);

    if (trainingWeeksError) throw new Error("Unable to load weekly training targets.");

    const components = trainingWeeks.flatMap((trainingWeek) =>
      trainingWeek.prescriptions
        .filter(
          (prescription) =>
            prescription.scheduled_date >= week.startDate
            && prescription.scheduled_date <= week.endDate,
        )
        .flatMap((prescription) => prescription.components),
    );
    targetDistanceM = sumTargetDistanceM(components);
  }

  const activitySummary = summarizeStravaActivities(activitiesResult.data);
  return {
    weekStartDate: week.startDate,
    weekEndDate: week.endDate,
    lastSuccessfulSyncAt: connection.last_successful_sync_at,
    totalActivities: activitySummary.totalActivities,
    runningDistanceM: activitySummary.runningDistanceM,
    targetDistanceM,
    completionPercent: distanceCompletionPercent(
      activitySummary.runningDistanceM,
      targetDistanceM,
    ),
  };
}
