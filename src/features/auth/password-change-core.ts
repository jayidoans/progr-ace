export async function performAuthenticatedPasswordChange(input: {
  password: string;
  updateAuthPassword: (password: string) => Promise<boolean>;
  clearRequirement: () => Promise<boolean>;
}) {
  if (!(await input.updateAuthPassword(input.password))) return "AUTH_FAILED" as const;
  if (!(await input.clearRequirement())) return "CLEAR_FAILED" as const;
  return "SUCCEEDED" as const;
}
