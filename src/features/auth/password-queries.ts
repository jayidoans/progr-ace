import "server-only";

import { redirect } from "next/navigation";

import { PASSWORD_STATUS_UNAVAILABLE_PATH } from "@/src/features/auth/password-enforcement";
import { requireAuthenticatedSession } from "@/src/features/auth/session";

export async function currentUserMustChangePassword() {
  const { supabase } = await requireAuthenticatedSession("/account/change-password", { allowForcedPasswordChange: true });
  const { data, error } = await supabase.rpc("current_user_must_change_password");
  if (error) redirect(PASSWORD_STATUS_UNAVAILABLE_PATH);
  return data === true;
}
