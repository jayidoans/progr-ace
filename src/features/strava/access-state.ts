export function stravaAccessActions(input: {
  isAthlete: boolean;
  allowed: boolean;
  connectionStatus: string | null;
}) {
  const connected = input.connectionStatus !== null;
  return {
    canAllow: input.isAthlete && !input.allowed && !connected,
    canRevoke: input.isAthlete && input.allowed && !connected,
    canDisconnect: connected,
    canConnect: input.isAthlete && input.allowed && (!connected || input.connectionStatus === "REAUTH_REQUIRED"),
    canSync: input.isAthlete && input.allowed && input.connectionStatus === "CONNECTED",
  };
}
