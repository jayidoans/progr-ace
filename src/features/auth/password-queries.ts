import "server-only";

import { requireAuthenticatedSession } from "@/src/features/auth/session";

export async function currentUserMustChangePassword() {
  const { supabase } = await requireAuthenticatedSession("/account/change-password", { allowForcedPasswordChange: true });
  const { data, error } = await supabase.rpc("current_user_must_change_password");
  if (error) throw new Error("Unable to determine password status.");
  return data === true;
}
