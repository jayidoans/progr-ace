"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  closeRaceGoalSchema,
  completeCoachedRaceGoalSchema,
  createRaceSchema,
  setActiveRaceGoalSchema,
  updateActiveRaceGoalSchema,
} from "@/src/features/race-goals/schemas";
import { createClient } from "@/src/lib/supabase/server";

type FeedbackKind = "error" | "message";

function raceGoalPath(kind: FeedbackKind, code: string, raceId?: string) {
  const params = new URLSearchParams({ [kind]: code });

  if (raceId) {
    params.set("raceId", raceId);
  }

  return `/dashboard/race-goals?${params.toString()}`;
}

function targetFinishTime(formData: FormData) {
  return ["targetFinishHours", "targetFinishMinutes", "targetFinishSeconds"]
    .map((name) => String(formData.get(name) ?? ""))
    .join(":");
}

async function authenticatedContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=/dashboard/race-goals");
  }

  return { supabase, user };
}

function revalidateRaceGoalViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/race-goals");
}

export async function createRace(formData: FormData) {
  const parsed = createRaceSchema.safeParse({
    name: formData.get("name"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    distanceKm: formData.get("distanceKm"),
  });

  if (!parsed.success) {
    redirect(raceGoalPath("error", "invalid-race"));
  }

  const { supabase, user } = await authenticatedContext();
  const [adminRole, coachRole] = await Promise.all([
    supabase.rpc("has_role", { p_role_code: "ADMIN" }),
    supabase.rpc("has_role", { p_role_code: "COACH" }),
  ]);
  if (
    adminRole.error
    || coachRole.error
    || (!adminRole.data && !coachRole.data)
  ) {
    redirect(raceGoalPath("error", "race-create-forbidden"));
  }
  const { data, error } = await supabase
    .from("races")
    .insert({
      name: parsed.data.name,
      event_date: parsed.data.eventDate,
      location: parsed.data.location,
      distance_m: parsed.data.distanceKm,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    const code = error?.code === "23505" ? "race-exists" : "race-create-failed";
    redirect(raceGoalPath("error", code));
  }

  revalidateRaceGoalViews();
  redirect(raceGoalPath("message", "race-created", data.id));
}

export async function setActiveRaceGoal(formData: FormData) {
  const parsed = setActiveRaceGoalSchema.safeParse({
    raceId: formData.get("raceId"),
    targetFinishTimeSec: targetFinishTime(formData),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect(raceGoalPath("error", "invalid-goal"));
  }

  const { supabase } = await authenticatedContext();
  const { error } = await supabase.rpc("set_active_race_goal", {
    p_race_id: parsed.data.raceId,
    p_target_finish_time_sec: parsed.data.targetFinishTimeSec,
    p_notes: parsed.data.notes ?? undefined,
  });

  if (error) {
    redirect(raceGoalPath("error", "goal-switch-failed"));
  }

  revalidateRaceGoalViews();
  redirect(raceGoalPath("message", "goal-set"));
}

export async function updateActiveRaceGoal(formData: FormData) {
  const parsed = updateActiveRaceGoalSchema.safeParse({
    goalId: formData.get("goalId"),
    targetFinishTimeSec: targetFinishTime(formData),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect(raceGoalPath("error", "invalid-goal"));
  }

  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase
    .from("athlete_race_goals")
    .update({
      target_finish_time_sec: parsed.data.targetFinishTimeSec,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.goalId)
    .eq("status", "ACTIVE")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(raceGoalPath("error", "goal-update-failed"));
  }

  revalidateRaceGoalViews();
  redirect(raceGoalPath("message", "goal-updated"));
}

export async function closeRaceGoal(formData: FormData) {
  const parsed = closeRaceGoalSchema.safeParse({
    goalId: formData.get("goalId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(raceGoalPath("error", "invalid-goal"));
  }

  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase
    .from("athlete_race_goals")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.goalId)
    .eq("status", "ACTIVE")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(raceGoalPath("error", "goal-close-failed"));
  }

  revalidateRaceGoalViews();
  redirect(raceGoalPath("message", "goal-cancelled"));
}

export async function completeCoachedRaceGoal(formData: FormData) {
  const parsed = completeCoachedRaceGoalSchema.safeParse({
    goalId: formData.get("goalId"),
    athleteId: formData.get("athleteId"),
  });
  const athleteId = String(formData.get("athleteId") ?? "");
  const basePath = `/dashboard/coaching/athletes/${athleteId}`;
  if (!parsed.success) redirect(`${basePath}?error=invalid-goal`);

  const { supabase } = await authenticatedContext();
  const { error } = await supabase.rpc("complete_coached_race_goal", {
    p_race_goal_id: parsed.data.goalId,
  });
  if (error) {
    const code = error.message.includes("before race day")
      ? "race-not-finished"
      : "completion-failed";
    redirect(`${basePath}?error=${code}`);
  }

  revalidateRaceGoalViews();
  revalidatePath("/dashboard/coaching/athletes");
  revalidatePath(basePath);
  revalidatePath("/dashboard/training");
  redirect(`${basePath}?message=goal-completed`);
}
