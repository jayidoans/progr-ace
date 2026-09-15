"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { activityFormSchema, activityIdSchema } from "@/src/features/activities/schemas";
import { createClient } from "@/src/lib/supabase/server";

async function activityContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard/activities");
  return { supabase, user };
}

function activityInput(formData: FormData) {
  return {
    name: formData.get("name"),
    sportType: formData.get("sportType"),
    startedAt: formData.get("startedAt"),
    timezoneOffsetMinutes: formData.get("timezoneOffsetMinutes"),
    distanceKm: formData.get("distanceKm"),
    duration: formData.get("duration"),
    averageHrBpm: formData.get("averageHrBpm"),
    maxHrBpm: formData.get("maxHrBpm"),
    elevationGainM: formData.get("elevationGainM"),
    rpe: formData.get("rpe"),
    notes: formData.get("notes"),
  };
}

function activityValues(parsed: z.infer<typeof activityFormSchema>) {
  return {
    name: parsed.name,
    sport_type: parsed.sportType,
    started_at: parsed.startedAtIso,
    distance_m: parsed.distanceKm,
    duration_sec: parsed.duration,
    average_hr_bpm: parsed.averageHrBpm,
    max_hr_bpm: parsed.maxHrBpm,
    elevation_gain_m: parsed.elevationGainM,
    rpe: parsed.rpe,
    notes: parsed.notes,
  };
}

export async function createActivity(formData: FormData) {
  const parsed = activityFormSchema.safeParse(activityInput(formData));
  if (!parsed.success) redirect("/dashboard/activities/new?error=invalid-activity");
  const { supabase, user } = await activityContext();
  const { data, error } = await supabase
    .from("activities")
    .insert({ athlete_id: user.id, ...activityValues(parsed.data) })
    .select("id")
    .single();
  if (error || !data) redirect("/dashboard/activities/new?error=create-failed");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/activities");
  redirect(`/dashboard/activities/${data.id}?message=created`);
}

export async function updateActivity(formData: FormData) {
  const activityId = activityIdSchema.safeParse(formData.get("activityId"));
  const parsed = activityFormSchema.safeParse(activityInput(formData));
  if (!activityId.success || !parsed.success) {
    redirect("/dashboard/activities?error=invalid-activity");
  }
  const { supabase, user } = await activityContext();
  const { data, error } = await supabase
    .from("activities")
    .update(activityValues(parsed.data))
    .eq("id", activityId.data)
    .eq("athlete_id", user.id)
    .eq("source", "MANUAL")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(`/dashboard/activities/${activityId.data}/edit?error=update-failed`);
  revalidatePath("/dashboard/activities");
  revalidatePath(`/dashboard/activities/${activityId.data}`);
  redirect(`/dashboard/activities/${activityId.data}?message=updated`);
}

export async function deleteActivity(formData: FormData) {
  const activityId = activityIdSchema.safeParse(formData.get("activityId"));
  if (!activityId.success) redirect("/dashboard/activities?error=invalid-activity");
  const { supabase, user } = await activityContext();
  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId.data)
    .eq("athlete_id", user.id)
    .eq("source", "MANUAL")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(`/dashboard/activities/${activityId.data}?error=delete-failed`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/activities");
  redirect("/dashboard/activities?message=deleted");
}
