export function canOfferRaceGoalCompletion(
  status: string,
  raceDate: string,
  today: string,
) {
  return status === "ACTIVE" && today >= raceDate;
}
