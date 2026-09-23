export const RACE_RESULT_STATUSES = ["FINISHED", "DNF", "DNS"] as const;
export type RaceResultStatus = (typeof RACE_RESULT_STATUSES)[number];

export type RaceResult = {
  id: string;
  athleteRaceGoalId: string;
  status: RaceResultStatus;
  finishTimeSec: number | null;
  resultSource: "MANUAL";
  notes: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type RaceResultContext = RaceResult & {
  raceGoalStatus: string;
  raceName: string;
  raceDate: string;
  raceDistanceM: number;
  targetFinishTimeSec: number | null;
  athleteId: string;
};

export function targetDifferenceSec(result: Pick<RaceResult, "status" | "finishTimeSec">, targetFinishTimeSec: number | null) {
  if (result.status !== "FINISHED" || result.finishTimeSec === null || targetFinishTimeSec === null) return null;
  return result.finishTimeSec - targetFinishTimeSec;
}

export function isRaceResultStatus(value: string): value is RaceResultStatus {
  return RACE_RESULT_STATUSES.includes(value as RaceResultStatus);
}
