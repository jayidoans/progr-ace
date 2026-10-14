import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  buildDemoSeedPlan,
  demoActivitySource,
  demoActualMetrics,
  demoEntityId,
  plannedDistanceM,
  plannedDurationSec,
  requiresCoachReview,
  type DemoSessionOutcome,
} from "../src/features/demo/seed";
import { parsePrograceTemplateV1 } from "../src/features/training-import/parsers/prograce-template-v1";
import type { Database } from "../src/types/database";

const projectRoot = join(__dirname, "..");
const seedEnvKeys = [
  "PROGRACE_DEMO_SUPABASE_URL",
  "PROGRACE_DEMO_SUPABASE_SECRET_KEY",
  "PROGRACE_DEMO_PROJECT_REF",
  "PROGRACE_DEMO_ATHLETE_EMAIL",
  "PROGRACE_DEMO_ATHLETE_PASSWORD",
  "PROGRACE_DEMO_COACH_EMAIL",
  "PROGRACE_DEMO_COACH_PASSWORD",
  "PROGRACE_DEMO_TRAINING_WORKBOOK",
  "PROGRACE_DEMO_REFERENCE_DATE",
  "PROGRACE_DEMO_RACE_DATE",
] as const;

function loadSeedEnvironment(path = join(projectRoot, ".env.demo.seed.local")) {
  let contents = "";
  try {
    contents = readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const fileValues: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) throw new Error("Invalid demo seed environment file format.");
    const [, key, rawValue] = match;
    if (!seedEnvKeys.includes(key as (typeof seedEnvKeys)[number])) {
      throw new Error(`Demo seed environment file must not contain ${key}.`);
    }
    const value = rawValue.trim();
    fileValues[key] = /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }

  return Object.fromEntries(seedEnvKeys.map((key) => [key, process.env[key] ?? fileValues[key]]));
}

function required(values: Record<string, string | undefined>, key: (typeof seedEnvKeys)[number]) {
  const value = values[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function validateConfiguration(values: Record<string, string | undefined>) {
  const supabaseUrl = new URL(required(values, "PROGRACE_DEMO_SUPABASE_URL"));
  const projectRef = required(values, "PROGRACE_DEMO_PROJECT_REF");
  if (supabaseUrl.protocol !== "https:" || supabaseUrl.hostname !== `${projectRef}.supabase.co`) {
    throw new Error("The confirmed demo project ref does not match PROGRACE_DEMO_SUPABASE_URL.");
  }

  const productionEnvPath = join(projectRoot, ".env.production.local");
  try {
    const productionEnv = readFileSync(productionEnvPath, "utf8");
    const productionUrl = productionEnv.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]
      ?.trim().replace(/^(['"])(.*)\1$/, "$2");
    if (productionUrl && new URL(productionUrl).origin === supabaseUrl.origin) {
      throw new Error("Demo provisioning refuses to use the production Supabase project.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error("Demo provisioning requires .env.production.local for project-isolation validation.");
  }

  const athletePassword = required(values, "PROGRACE_DEMO_ATHLETE_PASSWORD");
  const coachPassword = required(values, "PROGRACE_DEMO_COACH_PASSWORD");
  if (athletePassword.length < 20 || coachPassword.length < 20) {
    throw new Error("Demo account passwords must contain at least 20 characters.");
  }
  if (athletePassword === coachPassword) {
    throw new Error("Athlete and Coach demo accounts must use different passwords.");
  }

  return {
    supabaseUrl: supabaseUrl.origin,
    secretKey: required(values, "PROGRACE_DEMO_SUPABASE_SECRET_KEY"),
    athleteEmail: required(values, "PROGRACE_DEMO_ATHLETE_EMAIL").toLowerCase(),
    athletePassword,
    coachEmail: required(values, "PROGRACE_DEMO_COACH_EMAIL").toLowerCase(),
    coachPassword,
    workbookPath: required(values, "PROGRACE_DEMO_TRAINING_WORKBOOK"),
    referenceDate: required(values, "PROGRACE_DEMO_REFERENCE_DATE"),
    raceDate: required(values, "PROGRACE_DEMO_RACE_DATE"),
  };
}

function throwIfError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation} failed: ${error.message}`);
}

async function findOrCreateUser(
  supabase: ReturnType<typeof createClient<Database>>,
  input: { email: string; password: string; fullName: string },
) {
  let page = 1;
  let existing: { id: string; email?: string } | undefined;
  while (!existing) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (result.error) throw new Error(`Demo Auth lookup failed: ${result.error.message}`);
    existing = result.data.users.find((user) => user.email?.toLowerCase() === input.email);
    if (existing || result.data.users.length < 200) break;
    page += 1;
  }
  if (existing) return existing.id;

  const created = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (created.error || !created.data.user) {
    throw new Error(`Demo Auth creation failed: ${created.error?.message ?? "No user returned."}`);
  }
  return created.data.user.id;
}

async function insertIgnore(
  supabase: ReturnType<typeof createClient<Database>>,
  table: keyof Database["public"]["Tables"],
  rows: Record<string, unknown>[],
  onConflict = "id",
) {
  if (rows.length === 0) return;
  const result = await supabase.from(table).upsert(rows as never, {
    onConflict,
    ignoreDuplicates: true,
  });
  throwIfError(result.error, `Insert ${table}`);
}

function finalValidation(outcome: DemoSessionOutcome) {
  if (outcome === "OVER_TARGET" || outcome === "VERIFIED") return "VERIFIED";
  if (outcome === "PARTIAL") return "PARTIAL";
  if (outcome === "REJECTED") return "REJECTED";
  return "NEEDS_REVIEW";
}

async function main() {
  const config = validateConfiguration(loadSeedEnvironment());
  const supabase = createClient<Database>(config.supabaseUrl, config.secretKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });

  const hardeningCheck = await supabase
    .from("demo_read_only_users" as never)
    .select("user_id")
    .limit(1);
  if (hardeningCheck.error) {
    throw new Error("Apply supabase/demo/0001_read_only_hardening.sql before provisioning demo data.");
  }

  const parsed = await parsePrograceTemplateV1(readFileSync(config.workbookPath), {
    name: "Marathon Training",
    description: "Synthetic public demonstration plan.",
  });
  if (!parsed.plan || parsed.status === "ERROR") {
    throw new Error(`The demo workbook is invalid: ${parsed.errors.map((issue) => issue.message).join(" ")}`);
  }
  const plan = buildDemoSeedPlan(parsed.plan, {
    referenceDate: config.referenceDate,
    raceDate: config.raceDate,
  });

  const athleteId = await findOrCreateUser(supabase, {
    email: config.athleteEmail,
    password: config.athletePassword,
    fullName: "Atlit Strava",
  });
  const coachId = await findOrCreateUser(supabase, {
    email: config.coachEmail,
    password: config.coachPassword,
    fullName: "Kuch",
  });
  const demoUserIds = [athleteId, coachId];

  // Temporarily remove the registry entry so an interrupted previous attempt
  // can be completed. The finally block restores read-only protection.
  throwIfError(
    (await supabase.from("demo_read_only_users" as never).delete().in("user_id", demoUserIds)).error,
    "Open demo provisioning window",
  );

  try {
    await insertIgnore(supabase, "profiles", [
      { id: athleteId, full_name: "Atlit Strava", email: config.athleteEmail, must_change_password: false },
      { id: coachId, full_name: "Kuch", email: config.coachEmail, must_change_password: false },
    ]);

    const roles = await supabase.from("roles").select("id,name").in("name", ["ATHLETE", "COACH"]);
    throwIfError(roles.error, "Load demo roles");
    const roleId = new Map((roles.data ?? []).map((role) => [role.name, role.id]));
    if (!roleId.has("ATHLETE") || !roleId.has("COACH")) throw new Error("ATHLETE and COACH roles are required.");
    throwIfError(
      (await supabase.from("user_roles").delete().in("user_id", demoUserIds)).error,
      "Reset demo roles",
    );
    await insertIgnore(supabase, "user_roles", [
      { user_id: athleteId, role_id: roleId.get("ATHLETE")! },
      { user_id: coachId, role_id: roleId.get("COACH")! },
    ], "user_id,role_id");

    const raceId = demoEntityId("race");
    const goalId = demoEntityId("goal");
    const programId = demoEntityId("program");
    await insertIgnore(supabase, "races", [{
      id: raceId,
      name: "The International Marathon",
      event_date: config.raceDate,
      distance_m: 42_195,
      location: "Synthetic international course",
      created_by: coachId,
    }]);
    await insertIgnore(supabase, "athlete_race_goals", [{
      id: goalId,
      athlete_id: athleteId,
      race_id: raceId,
      target_finish_time_sec: 19_800,
      status: "ACTIVE",
      notes: "Synthetic marathon goal for the public ProgrACE research demonstration.",
    }]);
    await insertIgnore(supabase, "training_programs", [{
      id: programId,
      race_goal_id: goalId,
      name: plan.name,
      description: plan.description,
      start_date: plan.startDate,
      end_date: plan.endDate,
      tracking_start_date: plan.startDate,
      created_by: coachId,
      status: "PUBLISHED",
    }]);

    const weekRows: Record<string, unknown>[] = [];
    const prescriptionRows: Record<string, unknown>[] = [];
    const componentRows: Record<string, unknown>[] = [];
    const activityRows: Record<string, unknown>[] = [];
    const claimRows: Record<string, unknown>[] = [];
    const claimActivityRows: Record<string, unknown>[] = [];
    const claimOutcomes: Array<{ claimId: string; outcome: DemoSessionOutcome; structured: boolean }> = [];
    const weekReviewRows: Record<string, unknown>[] = [];
    let prescriptionSequence = 0;
    let componentSequence = 0;
    let evidenceSequence = 0;

    for (const week of plan.weeks) {
      const weekId = demoEntityId("week", week.weekNumber);
      weekRows.push({
        id: weekId,
        training_program_id: programId,
        week_number: week.weekNumber,
        phase: week.phase,
        start_date: week.startDate,
        end_date: week.endDate,
        planning_status: "PUBLISHED",
      });
      if (week.endDate < config.referenceDate) {
        weekReviewRows.push({
          id: demoEntityId("weekReview", week.weekNumber),
          training_week_id: weekId,
          reviewed_by: coachId,
          fulfillment_rating: 2 + (week.weekNumber % 4),
          coach_comment: week.weekNumber % 2 === 0
            ? "Consistent work this week. Keep recovery controlled."
            : "Good progress with one area to refine next week.",
        });
      }

      for (const session of week.prescriptions) {
        prescriptionSequence += 1;
        const prescriptionId = demoEntityId("prescription", prescriptionSequence);
        prescriptionRows.push({
          id: prescriptionId,
          training_week_id: weekId,
          training_menu: session.trainingMenu,
          scheduled_date: session.scheduledDate,
          title: session.title,
          description: session.description,
        });
        for (const component of session.components) {
          componentSequence += 1;
          componentRows.push({
            id: demoEntityId("component", componentSequence),
            prescription_id: prescriptionId,
            sequence_order: component.sequenceOrder,
            component_type: component.componentType,
            target_distance_m: component.targetDistanceM,
            target_duration_sec: component.targetDurationSec,
            repetitions: component.repetitions,
            distance_per_rep_m: component.distancePerRepM,
            recovery_duration_sec: component.recoveryDurationSec,
            target_pace_min_sec_per_km: component.targetPaceMinSecPerKm,
            target_pace_max_sec_per_km: component.targetPaceMaxSecPerKm,
            instruction: component.instruction,
          });
        }

        if (session.outcome === "MISSED" || session.outcome === "UPCOMING") continue;
        evidenceSequence += 1;
        const activityId = demoEntityId("activity", evidenceSequence);
        const claimId = demoEntityId("claim", evidenceSequence);
        const metrics = demoActualMetrics(session);
        activityRows.push({
          id: activityId,
          athlete_id: athleteId,
          name: `${session.title} evidence`,
          sport_type: session.outcome === "REJECTED" ? "CYCLING" : "RUNNING",
          started_at: `${session.scheduledDate}T06:00:00+07:00`,
          distance_m: metrics.distanceM,
          duration_sec: metrics.durationSec,
          average_hr_bpm: 142 + (evidenceSequence % 18),
          max_hr_bpm: 166 + (evidenceSequence % 15),
          elevation_gain_m: metrics.distanceM === null ? null : Math.round(metrics.distanceM / 125),
          rpe: 3 + (evidenceSequence % 6),
          notes: `Synthetic ${session.outcome.toLowerCase().replace("_", " ")} evidence.`,
          source: demoActivitySource(evidenceSequence),
          external_activity_id: demoActivitySource(evidenceSequence) === "STRAVA"
            ? `demo-strava-${evidenceSequence}`
            : null,
        });
        claimRows.push({
          id: claimId,
          athlete_id: athleteId,
          prescription_id: prescriptionId,
          status: "DRAFT",
          athlete_note: session.outcome === "PARTIAL"
            ? "I shortened this session and recorded the completed work."
            : "Synthetic demonstration evidence.",
        });
        claimActivityRows.push({
          id: demoEntityId("claimActivity", evidenceSequence),
          claim_id: claimId,
          activity_id: activityId,
        });
        claimOutcomes.push({
          claimId,
          outcome: session.outcome,
          structured: requiresCoachReview(session),
        });
      }
    }

    const stravaPreviewRows = activityRows.slice(0, 4).map((activity, index) => ({
      ...activity,
      id: demoEntityId("activity", 9001 + index),
      name: `Strava imported · ${String(activity.name)}`,
      source: "STRAVA",
      external_activity_id: `demo-strava-${index + 1}`,
      notes: "Synthetic activity imported by the demo Strava sync.",
    }));
    activityRows.push(...stravaPreviewRows);

    await insertIgnore(supabase, "training_weeks", weekRows);
    await insertIgnore(supabase, "training_prescriptions", prescriptionRows);
    const existingComponents = await supabase
      .from("prescription_components")
      .select("id")
      .in("id", componentRows.map((component) => component.id as string));
    throwIfError(existingComponents.error, "Check synthetic prescription components");
    if ((existingComponents.data ?? []).length === 0) {
      await insertIgnore(supabase, "prescription_components", componentRows);
    } else if ((existingComponents.data ?? []).length !== componentRows.length) {
      throw new Error("Existing demo prescription components are incomplete; refusing a partial immutable refresh.");
    }
    await insertIgnore(supabase, "activities", activityRows);
    await insertIgnore(supabase, "training_claims", claimRows);
    const existingClaimActivities = await supabase
      .from("claim_activities")
      .select("id")
      .in("id", claimActivityRows.map((item) => item.id as string));
    throwIfError(existingClaimActivities.error, "Check synthetic claim activities");
    if ((existingClaimActivities.data ?? []).length === 0) {
      await insertIgnore(supabase, "claim_activities", claimActivityRows);
    } else if ((existingClaimActivities.data ?? []).length !== claimActivityRows.length) {
      throw new Error("Existing demo claim activities are incomplete; refusing a partial immutable refresh.");
    }

    const claimIds = claimOutcomes.map((item) => item.claimId);
    if (claimIds.length > 0) {
      const submittedAt = `${config.referenceDate}T00:00:00.000Z`;
      const submission = await supabase
        .from("training_claims")
        .update({ status: "SUBMITTED", submitted_at: submittedAt })
        .in("id", claimIds)
        .eq("status", "DRAFT");
      throwIfError(submission.error, "Submit synthetic Claims");

      for (const item of claimOutcomes) {
        const result = finalValidation(item.outcome);
        const reviewed = item.outcome === "REJECTED"
          || (item.structured && item.outcome !== "NEEDS_REVIEW");
        const validationUpdate = await supabase
          .from("claim_validations")
          .update({
            automatic_result: item.structured ? "NEEDS_REVIEW" : result,
            result,
            evaluation_source: reviewed ? "COACH" : "AUTOMATIC",
            reviewer_id: reviewed ? coachId : null,
            reviewer_note: reviewed
              ? item.outcome === "REJECTED"
                ? "The selected evidence does not demonstrate the prescribed running session."
                : "The structured session evidence was reviewed for the demonstration."
              : null,
            reviewed_at: reviewed ? submittedAt : null,
          })
          .eq("claim_id", item.claimId);
        throwIfError(validationUpdate.error, "Finalize synthetic validation");
      }
    }

    await insertIgnore(supabase, "training_week_reviews", weekReviewRows);

    const outcomeCounts = plan.weeks
      .flatMap((week) => week.prescriptions)
      .reduce<Record<string, number>>((counts, session) => {
        counts[session.outcome] = (counts[session.outcome] ?? 0) + 1;
        return counts;
      }, {});
    const measurableSessions = plan.weeks.flatMap((week) => week.prescriptions)
      .filter((session) => plannedDistanceM(session) !== null || plannedDurationSec(session) !== null)
      .length;
    console.info(JSON.stringify({
      event: "demo-provisioning-complete",
      weeks: plan.weeks.length,
      sessions: plan.weeks.flatMap((week) => week.prescriptions).length,
      measurableSessions,
      outcomes: outcomeCounts,
      referenceDate: config.referenceDate,
      raceDate: config.raceDate,
    }));
  } finally {
    const registration = await supabase
      .from("demo_read_only_users" as never)
      .upsert(demoUserIds.map((user_id) => ({ user_id })) as never, {
        onConflict: "user_id",
        ignoreDuplicates: true,
      });
    throwIfError(registration.error, "Restore demo read-only protection");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo provisioning failed.");
  process.exitCode = 1;
});
