import "server-only";

import { notFound, redirect } from "next/navigation";

import {
  activityListCutoff,
  activityListQueryLimit,
  paginateActivityList,
  type ActivityListLimit,
} from "@/src/features/activities/listing";
import { activityIdSchema } from "@/src/features/activities/schemas";
import { createClient } from "@/src/lib/supabase/server";
import type { Tables } from "@/src/types/database";

export type Activity = Tables<"activities">;
export type ActivityClaimUsage = {
  claimId: string;
  prescriptionId: string;
  status: "DRAFT" | "SUBMITTED";
};
export type ActivityWithClaimUsage = Activity & { claimUsage: ActivityClaimUsage | null };

async function activityContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard/activities");
  return { supabase, user };
}

async function attachClaimUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activities: Activity[],
): Promise<ActivityWithClaimUsage[]> {
  if (activities.length === 0) return [];
  const { data, error } = await supabase
    .from("claim_activities")
    .select("activity_id, claim:training_claims(id, prescription_id, status)")
    .in("activity_id", activities.map((activity) => activity.id));
  if (error) throw new Error("Unable to load activity claim usage.");
  const usage = new Map(
    data.map((row) => [
      row.activity_id,
      {
        claimId: row.claim.id,
        prescriptionId: row.claim.prescription_id,
        status: row.claim.status as ActivityClaimUsage["status"],
      },
    ]),
  );
  return activities.map((activity) => ({
    ...activity,
    claimUsage: usage.get(activity.id) ?? null,
  }));
}

export async function getActivities(
  visibleLimit: ActivityListLimit,
): Promise<{ activities: ActivityWithClaimUsage[]; hasMore: boolean }> {
  const { supabase, user } = await activityContext();
  const queryLimit = activityListQueryLimit(visibleLimit);
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("athlete_id", user.id)
    .gte("started_at", activityListCutoff())
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(queryLimit);
  if (error) throw new Error("Unable to load activities.");
  const page = paginateActivityList(data, visibleLimit);
  const activities = await attachClaimUsage(supabase, page.records);
  return { activities, hasMore: page.hasMore };
}

export async function getActivity(id: string): Promise<ActivityWithClaimUsage> {
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
  const [activity] = await attachClaimUsage(supabase, [data]);
  return activity;
}
