"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/src/features/admin/queries";
import { performAdminPasswordReset } from "@/src/features/auth/admin-password-reset-core";
import { passwordChangeSchema, generateTemporaryPassword } from "@/src/features/auth/password";
import { performAuthenticatedPasswordChange } from "@/src/features/auth/password-change-core";
import { requireAuthenticatedSession } from "@/src/features/auth/session";
import { createAdminClient } from "@/src/lib/supabase/admin";

export type PasswordActionState = { message: string; temporaryPassword?: string };

export async function changeMyPassword(
  _previous: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = passwordChangeSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check your password." };

  const { supabase, user } = await requireAuthenticatedSession("/account/change-password", { allowForcedPasswordChange: true });
  const { data: wasRequired, error: statusError } = await supabase.rpc("current_user_must_change_password");
  if (statusError) return { message: "Password status could not be verified. Please try again." };

  if (!wasRequired) {
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { message: "Your password could not be changed. Please try a different password." };
    revalidatePath("/", "layout");
    redirect("/dashboard/profile?message=password-changed");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { message: "Password change is temporarily unavailable. Please contact an administrator." };
  }
  const result = await performAuthenticatedPasswordChange({
    password: parsed.data.password,
    updateAuthPassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      return !error;
    },
    clearRequirement: async () => {
      const { error } = await admin.rpc("set_user_must_change_password", {
        p_user_id: user.id,
        p_required: false,
      });
      return !error;
    },
  });
  if (result === "AUTH_FAILED") return { message: "Your password could not be changed. Please try a different password." };
  if (result === "CLEAR_FAILED") return { message: "Your password changed, but account access could not be restored yet. Please try again." };

  revalidatePath("/", "layout");
  redirect("/dashboard/profile?message=password-changed");
}

export async function resetUserPassword(
  userId: string,
  _previous: PasswordActionState,
  _formData: FormData,
): Promise<PasswordActionState> {
  void _previous;
  void _formData;
  await getAdminUser(userId);
  const { supabase, user: adminUser } = await requireAuthenticatedSession(`/dashboard/admin/users/${userId}`);
  const { data: statusRows, error: statusError } = await supabase.rpc("admin_get_user_password_status", { p_user_id: userId });
  if (statusError || !statusRows[0]) return { message: "The account password status could not be loaded." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { message: "Password reset is not configured on this environment." };
  }

  const result = await performAdminPasswordReset({
    adminUserId: adminUser.id,
    targetUserId: userId,
    wasRequired: statusRows[0].must_change_password,
  }, {
    generatePassword: generateTemporaryPassword,
    setRequired: async (required) => {
      const { error } = await admin.rpc("set_user_must_change_password", { p_user_id: userId, p_required: required });
      return !error;
    },
    updateAuthPassword: async (password) => {
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      return !error;
    },
  });
  if (!result.ok) return { message: result.message };

  revalidatePath(`/dashboard/admin/users/${userId}`);
  return { message: result.message, temporaryPassword: result.temporaryPassword };
}
