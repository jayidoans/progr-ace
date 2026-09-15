import "server-only";

import { createClient } from "@/src/lib/supabase/server";
import type { Tables } from "@/src/types/database";

export type Profile = Tables<"profiles">;

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

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
