import "server-only";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import {
  complianceCounts,
  currentWeekFromPrescriptionDates,
  daysUntilDate,
  flattenPrescriptions,
  publishedEvaluationWeeks,
  prescriptionComplianceState,
  weeklyDistanceSummary,
  type ComplianceCounts,
  type EvaluationActivity,
  type EvaluationPrescription,
  type EvaluationProgram,
  type EvaluationWeek,
} from "@/src/features/evaluation/analytics";
import { groupCoachProgramsByGoal } from "@/src/features/evaluation/coach-athlete-progress";
import type { Profile } from "@/src/features/profiles/queries";
import type { RaceGoalWithRace } from "@/src/features/race-goals/queries";
import { utcDateString } from "@/src/features/validation/engine/compliance";
import {
  ACTIVE_MODE_STORAGE_KEY,
  resolveActiveMode,
} from "@/src/features/navigation/active-mode";

const evaluationProgramSelection = `
  id,
  name,
  status,
  start_date,
  end_date,
  tracking_start_date,
  created_by,
  race_goal:athlete_race_goals!inner (
    id,
    athlete_id,
    status,
    target_finish_time_sec,
    completed_at,
    completed_by,
    athlete:profiles!athlete_race_goals_athlete_id_fkey (id, full_name, email),
    race:races (id, name, event_date, distance_m)
  ),
  weeks:training_weeks (
    id,
    week_number,
    phase,
    planning_status,
    start_date,
    end_date,
    prescriptions:training_prescriptions (
      id,
      scheduled_date,
      title,
      training_menu,
      components:prescription_components (id, target_distance_m, sequence_order),
      claims:training_claims (
        id,
        status,
        submitted_at,
        validation:claim_validations (result, evaluation_source),
        evidence:claim_activities (
          activity:activities (id, distance_m, duration_sec, rpe, source, sport_type, started_at)
        )
      )
    )
  )
`;

const activeGoalSelection = `
  id,
  athlete_id,
  race_id,
  target_finish_time_sec,
  status,
  notes,
  completed_at,
  completed_by,
  created_at,
  updated_at,
  race:races (id, name, event_date, location, distance_m, created_by, created_at, updated_at)
`;

export type EvaluationAttentionItem = {
  prescriptionId: string;
  title: string;
  scheduledDate: string;
  state: string;
  claimId: string | null;
};

export type RecentValidationItem = {
  claimId: string;
  prescriptionId: string;
  title: string;
  scheduledDate: string;
  result: string;
  actualDistanceM: number;
  activityCount: number;
  rpeValues: number[];
};

export type AthleteEvaluationDashboard = {
  mode: "ATHLETE";
  profile: Profile | null;
  activeGoal: RaceGoalWithRace | null;
  daysUntilRace: number | null;
  currentProgram: EvaluationProgram | null;
  currentWeek: EvaluationWeek | null;
  compliance: ComplianceCounts | null;
  weeklyDistance: ReturnType<typeof weeklyDistanceSummary> | null;
  recentValidations: RecentValidationItem[];
  attention: EvaluationAttentionItem[];
  today: string;
};

export type CoachProgramOverview = {
  id: string;
  name: string;
  athleteId: string;
  athleteName: string;
  raceName: string;
  currentWeekNumber: number | null;
  prescribedSessions: number;
  compliance: ComplianceCounts;
};

export type CoachAthleteOverview = {
  athleteId: string;
  athleteName: string;
  raceName: string | null;
  currentWeekNumber: number | null;
  programCount: number;
  compliance: ComplianceCounts;
};

export type CoachReviewItem = {
  claimId: string;
  athleteName: string;
  prescriptionTitle: string;
  scheduledDate: string;
  activityCount: number;
  actualDistanceM: number;
};

export type CoachMissedItem = {
  programId: string;
  athleteName: string;
  prescriptionTitle: string;
  scheduledDate: string;
};

export type CoachEvaluationDashboard = {
  mode: "COACH";
  isAdmin: boolean;
  programs: CoachProgramOverview[];
  athletes: CoachAthleteOverview[];
  needsReview: CoachReviewItem[];
  missed: CoachMissedItem[];
  today: string;
};

export type EvaluationDashboard = AthleteEvaluationDashboard | CoachEvaluationDashboard;

export type ProgramEvaluationOverview = {
  program: CoachProgramOverview;
  needsReview: CoachReviewItem[];
  missed: CoachMissedItem[];
};

export type CoachRaceGoalProgress = {
  goalId: string;
  status: string;
  raceName: string;
  raceDate: string;
  raceDistanceM: number;
  targetFinishTimeSec: number;
  completedAt: string | null;
  currentProgram: CoachProgramOverview;
  programCount: number;
  needsReview: CoachReviewItem[];
  missed: CoachMissedItem[];
};

export type CoachAthleteProgress = {
  athleteId: string;
  athleteName: string;
  athleteEmail: string | null;
  goals: CoachRaceGoalProgress[];
};

export type CoachAthletesProgress = {
  isAdmin: boolean;
  athletes: CoachAthleteProgress[];
  today: string;
};

function normalizeProgram(program: EvaluationProgram): EvaluationProgram {
  program.weeks = publishedEvaluationWeeks(program.weeks);
  program.weeks.sort((left, right) => left.week_number - right.week_number);
  program.weeks.forEach((week) => {
    week.prescriptions.sort((left, right) =>
      left.scheduled_date.localeCompare(right.scheduled_date) || left.id.localeCompare(right.id),
    );
    week.prescriptions.forEach((prescription) => {
      prescription.components.sort((left, right) => left.sequence_order - right.sequence_order);
    });
  });
  return program;
}

function emptyCompliance(): ComplianceCounts {
  return {
    UPCOMING: 0,
    NOT_CLAIMED: 0,
    DRAFT: 0,
    SUBMITTED: 0,
    VERIFIED: 0,
    PARTIAL: 0,
    NEEDS_REVIEW: 0,
    REJECTED: 0,
    MISSED: 0,
  };
}

function addCompliance(target: ComplianceCounts, source: ComplianceCounts) {
  (Object.keys(target) as (keyof ComplianceCounts)[]).forEach((key) => {
    target[key] += source[key];
  });
}

function uniqueClaimActivities(prescription: EvaluationPrescription): EvaluationActivity[] {
  const submittedClaim = prescription.claims.find((claim) => claim.status === "SUBMITTED");
  const activities = new Map<string, EvaluationActivity>();
  submittedClaim?.evidence.forEach(({ activity }) => activities.set(activity.id, activity));
  return [...activities.values()];
}

async function getRoles(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedSession>>["supabase"],
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", userId);
  if (error) throw new Error("Unable to determine evaluation dashboard access.");
  return data.map((row) => row.role.name);
}

async function loadPrograms(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedSession>>["supabase"],
  options: {
    athleteId?: string;
    coachId?: string;
    isAdmin?: boolean;
    limit?: number;
    programId?: string;
  },
) {
  let query = supabase
    .from("training_programs")
    .select(evaluationProgramSelection as string)
    .eq("status", "PUBLISHED")
    .order("start_date", { ascending: false })
    .limit(options.limit ?? 12);
  if (options.athleteId) query = query.eq("race_goal.athlete_id", options.athleteId);
  if (options.coachId && !options.isAdmin) query = query.eq("created_by", options.coachId);
  if (options.programId) query = query.eq("id", options.programId);
  const { data, error } = await query;
  if (error) throw new Error("Unable to load evaluation programs.");
  return (data as unknown as EvaluationProgram[]).map(normalizeProgram);
}

function coachAthleteProgress(
  programs: EvaluationProgram[],
  today: string,
  claimStates: Map<string, string | null>,
): CoachAthleteProgress[] {
  const athleteMap = new Map<string, CoachAthleteProgress>();

  programs.forEach((program) => {
    const athlete = athleteMap.get(program.race_goal.athlete_id) ?? {
      athleteId: program.race_goal.athlete_id,
      athleteName: program.race_goal.athlete.full_name ?? "Athlete",
      athleteEmail: program.race_goal.athlete.email,
      goals: [],
    };
    athleteMap.set(athlete.athleteId, athlete);
  });

  groupCoachProgramsByGoal(programs).forEach((programsForGoal) => {
    const currentProgram = programsForGoal[0];
    const athlete = athleteMap.get(currentProgram.race_goal.athlete_id);
    if (!athlete) return;
    const operational = coachOperationalItems([currentProgram], today, claimStates);
    athlete.goals.push({
      goalId: currentProgram.race_goal.id,
      status: currentProgram.race_goal.status,
      raceName: currentProgram.race_goal.race.name,
      raceDate: currentProgram.race_goal.race.event_date,
      raceDistanceM: currentProgram.race_goal.race.distance_m,
      targetFinishTimeSec: currentProgram.race_goal.target_finish_time_sec,
      completedAt: currentProgram.race_goal.completed_at,
      currentProgram: coachProgramOverview(currentProgram, today, claimStates),
      programCount: programsForGoal.length,
      needsReview: operational.needsReview,
      missed: operational.missed,
    });
  });

  athleteMap.forEach((athlete) => {
    athlete.goals.sort((left, right) =>
      Number(right.status === "ACTIVE") - Number(left.status === "ACTIVE")
      || right.raceDate.localeCompare(left.raceDate),
    );
  });

  return [...athleteMap.values()].sort((left, right) => {
    const leftGoal = left.goals[0];
    const rightGoal = right.goals[0];
    const leftAttention = (leftGoal?.needsReview.length ?? 0) + (leftGoal?.missed.length ?? 0);
    const rightAttention = (rightGoal?.needsReview.length ?? 0) + (rightGoal?.missed.length ?? 0);
    return rightAttention - leftAttention || left.athleteName.localeCompare(right.athleteName);
  });
}

async function authorizedClaimStates(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedSession>>["supabase"],
  programIds: string[],
) {
  if (programIds.length === 0) return new Map<string, string | null>();
  const batches = Array.from(
    { length: Math.ceil(programIds.length / 20) },
    (_, index) => programIds.slice(index * 20, (index + 1) * 20),
  );
  const results = await Promise.all(batches.map((batch) =>
    supabase.rpc("get_authorized_program_claim_states", { p_program_ids: batch }),
  ));
  if (results.some((result) => result.error)) {
    throw new Error("Unable to load authorized Claim states.");
  }
  return new Map(results.flatMap((result) => result.data ?? []).map((row) => [
    row.prescription_id,
    row.claim_status,
  ]));
}

function coachProgramOverview(
  program: EvaluationProgram,
  today: string,
  claimStates: Map<string, string | null>,
): CoachProgramOverview {
  const prescriptions = flattenPrescriptions(program);
  return {
    id: program.id,
    name: program.name,
    athleteId: program.race_goal.athlete_id,
    athleteName: program.race_goal.athlete.full_name ?? "Athlete",
    raceName: program.race_goal.race.name,
    currentWeekNumber: currentWeekFromPrescriptionDates(program, today)?.week_number ?? null,
    prescribedSessions: prescriptions.length,
    compliance: complianceCounts(prescriptions, today, claimStates, program.tracking_start_date),
  };
}

function coachOperationalItems(
  programs: EvaluationProgram[],
  today: string,
  claimStates: Map<string, string | null>,
) {
  const needsReview: CoachReviewItem[] = [];
  const missed: CoachMissedItem[] = [];
  programs.forEach((program) => {
    flattenPrescriptions(program).forEach((prescription) => {
      const state = prescriptionComplianceState(
        prescription,
        today,
        claimStates.get(prescription.id) ?? null,
        program.tracking_start_date,
      );
      const submittedClaim = prescription.claims.find((claim) => claim.status === "SUBMITTED");
      if (state === "NEEDS_REVIEW" && submittedClaim) {
        const activities = uniqueClaimActivities(prescription);
        needsReview.push({
          claimId: submittedClaim.id,
          athleteName: program.race_goal.athlete.full_name ?? "Athlete",
          prescriptionTitle: prescription.title,
          scheduledDate: prescription.scheduled_date,
          activityCount: activities.length,
          actualDistanceM: activities.reduce((sum, activity) => sum + (activity.distance_m ?? 0), 0),
        });
      }
      if (state === "MISSED") {
        missed.push({
          programId: program.id,
          athleteName: program.race_goal.athlete.full_name ?? "Athlete",
          prescriptionTitle: prescription.title,
          scheduledDate: prescription.scheduled_date,
        });
      }
    });
  });
  needsReview.sort((left, right) => right.scheduledDate.localeCompare(left.scheduledDate));
  missed.sort((left, right) => right.scheduledDate.localeCompare(left.scheduledDate));
  return { needsReview: needsReview.slice(0, 8), missed: missed.slice(0, 8) };
}

async function athleteDashboard(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedSession>>["supabase"],
  userId: string,
  today: string,
): Promise<AthleteEvaluationDashboard> {
  const [profileResult, goalResult, programs] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, created_at, updated_at").eq("id", userId).maybeSingle(),
    supabase
      .from("athlete_race_goals")
      .select(activeGoalSelection)
      .eq("athlete_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    loadPrograms(supabase, { athleteId: userId }),
  ]);
  if (profileResult.error || goalResult.error) throw new Error("Unable to load athlete evaluation data.");

  const activeGoal = goalResult.data as RaceGoalWithRace | null;
  const currentProgram =
    programs.find((program) => currentWeekFromPrescriptionDates(program, today)) ??
    programs.find((program) => program.start_date <= today && program.end_date >= today) ??
    null;
  const currentWeek = currentProgram ? currentWeekFromPrescriptionDates(currentProgram, today) : null;
  const weeklyPrescriptions = currentWeek?.prescriptions ?? [];
  const compliance = currentWeek ? complianceCounts(weeklyPrescriptions, today, new Map(), currentProgram?.tracking_start_date) : null;
  const weeklyDistance = currentWeek ? weeklyDistanceSummary(weeklyPrescriptions) : null;

  const submitted = programs
    .flatMap((program) => flattenPrescriptions(program))
    .flatMap((prescription) =>
      prescription.claims
        .filter((claim) => claim.status === "SUBMITTED" && claim.validation)
        .map((claim) => ({ prescription, claim })),
    )
    .sort((left, right) =>
      (right.claim.submitted_at ?? "").localeCompare(left.claim.submitted_at ?? ""),
    )
    .slice(0, 5);
  const recentValidations = submitted.map(({ prescription, claim }) => {
    const activities = uniqueClaimActivities(prescription);
    return {
      claimId: claim.id,
      prescriptionId: prescription.id,
      title: prescription.title,
      scheduledDate: prescription.scheduled_date,
      result: claim.validation?.result ?? "SUBMITTED",
      actualDistanceM: activities.reduce((sum, activity) => sum + (activity.distance_m ?? 0), 0),
      activityCount: activities.length,
      rpeValues: activities.flatMap((activity) => (activity.rpe === null ? [] : [activity.rpe])),
    };
  });
  const attention = weeklyPrescriptions
    .map((prescription) => {
      const state = prescriptionComplianceState(prescription, today, undefined, currentProgram?.tracking_start_date);
      return {
        prescriptionId: prescription.id,
        title: prescription.title,
        scheduledDate: prescription.scheduled_date,
        state,
        claimId: prescription.claims[0]?.id ?? null,
      };
    })
    .filter((item) => ["DRAFT", "NOT_CLAIMED", "MISSED", "NEEDS_REVIEW"].includes(item.state));

  return {
    mode: "ATHLETE",
    profile: profileResult.data,
    activeGoal,
    daysUntilRace: activeGoal ? daysUntilDate(activeGoal.race.event_date, today) : null,
    currentProgram,
    currentWeek,
    compliance,
    weeklyDistance,
    recentValidations,
    attention,
    today,
  };
}

async function coachDashboard(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedSession>>["supabase"],
  userId: string,
  isAdmin: boolean,
  today: string,
): Promise<CoachEvaluationDashboard> {
  const programs = await loadPrograms(supabase, { coachId: userId, isAdmin });
  const claimStates = await authorizedClaimStates(supabase, programs.map((program) => program.id));
  const programOverviews = programs.map((program) => coachProgramOverview(program, today, claimStates));
  const athleteMap = new Map<string, CoachAthleteOverview>();
  programOverviews.forEach((program) => {
    const existing = athleteMap.get(program.athleteId) ?? {
      athleteId: program.athleteId,
      athleteName: program.athleteName,
      raceName: program.raceName,
      currentWeekNumber: program.currentWeekNumber,
      programCount: 0,
      compliance: emptyCompliance(),
    };
    existing.programCount += 1;
    if (existing.currentWeekNumber === null) existing.currentWeekNumber = program.currentWeekNumber;
    addCompliance(existing.compliance, program.compliance);
    athleteMap.set(program.athleteId, existing);
  });
  const operational = coachOperationalItems(programs, today, claimStates);
  return {
    mode: "COACH",
    isAdmin,
    programs: programOverviews,
    athletes: [...athleteMap.values()].sort((left, right) =>
      left.athleteName.localeCompare(right.athleteName),
    ),
    needsReview: operational.needsReview,
    missed: operational.missed,
    today,
  };
}

export async function getEvaluationDashboard(): Promise<EvaluationDashboard> {
  const { supabase, user } = await requireAuthenticatedSession();
  const roles = await getRoles(supabase, user.id);
  const today = utcDateString();
  const isAdmin = roles.includes("ADMIN");
  const activeMode = resolveActiveMode(
    roles,
    (await cookies()).get(ACTIVE_MODE_STORAGE_KEY)?.value,
  );
  if (activeMode === "COACH" || activeMode === "ADMIN") {
    return coachDashboard(supabase, user.id, isAdmin, today);
  }
  return athleteDashboard(supabase, user.id, today);
}

export async function getCoachProgramEvaluation(
  programId: string,
): Promise<ProgramEvaluationOverview | null> {
  const { supabase, user } = await requireAuthenticatedSession(`/dashboard/training/${programId}`);
  const roles = await getRoles(supabase, user.id);
  const isAdmin = roles.includes("ADMIN");
  if (!isAdmin && !roles.includes("COACH")) return null;
  const programs = await loadPrograms(supabase, { coachId: user.id, isAdmin, programId });
  const program = programs.find((item) => item.id === programId);
  if (!program) return null;
  const today = utcDateString();
  const claimStates = await authorizedClaimStates(supabase, [programId]);
  const operational = coachOperationalItems([program], today, claimStates);
  return {
    program: coachProgramOverview(program, today, claimStates),
    needsReview: operational.needsReview,
    missed: operational.missed,
  };
}

export async function getCoachAthletesProgress(
  athleteId?: string,
): Promise<CoachAthletesProgress> {
  if (athleteId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(athleteId)) {
    notFound();
  }
  const nextPath = athleteId
    ? `/dashboard/coaching/athletes/${athleteId}`
    : "/dashboard/coaching/athletes";
  const { supabase, user } = await requireAuthenticatedSession(nextPath);
  const roles = await getRoles(supabase, user.id);
  const isAdmin = roles.includes("ADMIN");
  if (!isAdmin && !roles.includes("COACH")) notFound();
  const programs = await loadPrograms(supabase, {
    athleteId,
    coachId: user.id,
    isAdmin,
    limit: 50,
  });
  const claimStates = await authorizedClaimStates(supabase, programs.map((program) => program.id));
  const today = utcDateString();
  return {
    isAdmin,
    athletes: coachAthleteProgress(programs, today, claimStates),
    today,
  };
}
