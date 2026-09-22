import "server-only";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import type { Tables } from "@/src/types/database";

export type Profile = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "created_at" | "updated_at">;

export async function getCurrentProfile(): Promise<Profile | null> {
  const { supabase, user } = await requireAuthenticatedSession();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the athlete profile.");
  }

  return data;
}
