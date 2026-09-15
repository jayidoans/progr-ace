"use client";

import { useEffect, useState } from "react";

import { createActivity, updateActivity } from "@/src/features/activities/actions";
import { ACTIVITY_SPORT_TYPES, formatSportType } from "@/src/features/activities/format";
import type { Activity } from "@/src/features/activities/queries";

function toLocalInputValue(date: Date) {
  const local = new Date(date.valueOf() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function durationInput(durationSec: number | null) {
  if (durationSec === null) return "";
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ActivityForm({ activity }: { activity?: Activity }) {
  const [startedAt, setStartedAt] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState("0");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const date = activity ? new Date(activity.started_at) : new Date();
    setStartedAt(toLocalInputValue(date));
    setTimezoneOffset(String(date.getTimezoneOffset()));
    setIsReady(true);
  }, [activity]);

  const action = activity ? updateActivity : createActivity;

  if (!isReady) {
    return <p className="text-sm text-gray-500">Preparing the activity form…</p>;
  }

  return (
    <form action={action} className="space-y-6">
      {activity ? <input name="activityId" type="hidden" value={activity.id} /> : null}
      <input name="timezoneOffsetMinutes" type="hidden" value={timezoneOffset} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-gray-800">
          Activity name
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity?.name ?? ""}
            maxLength={160}
            name="name"
            placeholder="Morning run"
            required
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Sport
          <select
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity?.sport_type ?? "RUNNING"}
            name="sportType"
          >
            {ACTIVITY_SPORT_TYPES.map((sportType) => (
              <option key={sportType} value={sportType}>
                {formatSportType(sportType)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Started at
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            name="startedAt"
            onChange={(event) => {
              const value = event.target.value;
              setStartedAt(value);
              const selectedDate = new Date(value);
              if (!Number.isNaN(selectedDate.valueOf())) {
                setTimezoneOffset(String(selectedDate.getTimezoneOffset()));
              }
            }}
            required
            type="datetime-local"
            value={startedAt}
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Distance (km)
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity?.distance_m === null ? "" : activity ? activity.distance_m / 1000 : ""}
            inputMode="decimal"
            name="distanceKm"
            placeholder="7.39"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Duration (HH:MM:SS or MM:SS)
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity ? durationInput(activity.duration_sec) : ""}
            inputMode="numeric"
            name="duration"
            placeholder="56:42"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Average heart rate (bpm)
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity?.average_hr_bpm ?? ""}
            inputMode="numeric"
            max={300}
            min={1}
            name="averageHrBpm"
            type="number"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Maximum heart rate (bpm)
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity?.max_hr_bpm ?? ""}
            inputMode="numeric"
            max={300}
            min={1}
            name="maxHrBpm"
            type="number"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Elevation gain (m)
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity?.elevation_gain_m ?? ""}
            inputMode="numeric"
            min={0}
            name="elevationGainM"
            type="number"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          RPE (1–10)
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
            defaultValue={activity?.rpe ?? ""}
            inputMode="numeric"
            max={10}
            min={1}
            name="rpe"
            type="number"
          />
        </label>
      </div>

      <label className="block text-sm font-semibold text-gray-800">
        Private notes
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          defaultValue={activity?.notes ?? ""}
          maxLength={4000}
          name="notes"
          placeholder="How did the activity feel?"
        />
        <span className="mt-1 block text-xs font-normal text-gray-500">
          Notes are visible only to you in this milestone.
        </span>
      </label>

      <button
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        type="submit"
      >
        {activity ? "Save changes" : "Save activity"}
      </button>
    </form>
  );
}
