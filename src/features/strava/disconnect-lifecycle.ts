export async function runStravaDisconnectLifecycle(input: {
  decryptRefreshToken: () => Promise<string>;
  revokeProvider: (refreshToken: string) => Promise<void>;
  removeLocalConnection: () => Promise<void>;
}) {
  const refreshToken = await input.decryptRefreshToken();
  await input.revokeProvider(refreshToken);
  await input.removeLocalConnection();
}
