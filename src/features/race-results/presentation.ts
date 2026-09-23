import type { RaceResultStatus } from "@/src/features/race-results/domain";

export function parseDurationInput(value: string) {
  const match = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes > 59 || seconds > 59) return null;
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

export function formatDurationInput(totalSeconds: number | null) {
  if (totalSeconds === null || totalSeconds <= 0) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function raceResultStatusLabel(status: RaceResultStatus) {
  return status === "FINISHED" ? "Finished" : status === "DNF" ? "Did Not Finish" : "Did Not Start";
}

export function formatDifferenceText(differenceSeconds: number | null) {
  if (differenceSeconds === null) return "—";
  if (differenceSeconds === 0) return "Matched target";
  const absolute = Math.abs(differenceSeconds);
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const seconds = absolute % 60;
  const parts = [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", seconds ? `${seconds}s` : ""].filter(Boolean).join(" ");
  return `${parts} ${differenceSeconds < 0 ? "faster" : "slower"} than target`;
}
