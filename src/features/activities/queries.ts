import "server-only";

import { notFound, redirect } from "next/navigation";

import { activityIdSchema } from "@/src/features/activities/schemas";
import { createClient } from "@/src/lib/supabase/server";
import type { Tables } from "@/src/types/database";

export type Activity = Tables<"activities">;

async function activityContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard/activities");
  return { supabase, user };
}

export async function getActivities(): Promise<Activity[]> {
  const { supabase, user } = await activityContext();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("athlete_id", user.id)
    .order("started_at", { ascending: false });
  if (error) throw new Error("Unable to load activities.");
  return data;
}

export async function getActivity(id: string): Promise<Activity> {
  const parsedId = activityIdSchema.safeParse(id);
  if (!parsedId.success) notFound();
  const { supabase, user } = await activityContext();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", parsedId.data)
    .eq("athlete_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load the activity.");
  if (!data) notFound();
  return data;
}

