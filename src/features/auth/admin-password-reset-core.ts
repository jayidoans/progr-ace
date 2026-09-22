export type AdminPasswordResetDependencies = {
  generatePassword: () => string;
  setRequired: (required: boolean) => Promise<boolean>;
  updateAuthPassword: (password: string) => Promise<boolean>;
};

export async function performAdminPasswordReset(
  input: { adminUserId: string; targetUserId: string; wasRequired: boolean },
  dependencies: AdminPasswordResetDependencies,
) {
  if (input.adminUserId === input.targetUserId) {
    return { ok: false as const, message: "Use Change My Password for your own account." };
  }
  const temporaryPassword = dependencies.generatePassword();
  if (!(await dependencies.setRequired(true))) {
    return { ok: false as const, message: "The temporary password requirement could not be set." };
  }
  if (!(await dependencies.updateAuthPassword(temporaryPassword))) {
    if (!input.wasRequired) await dependencies.setRequired(false);
    return { ok: false as const, message: "The password could not be reset. The existing password remains unchanged." };
  }
  return { ok: true as const, message: "Temporary password created.", temporaryPassword };
}
