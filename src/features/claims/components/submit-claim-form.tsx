"use client";

import { useState } from "react";

import { submitClaim } from "@/src/features/claims/actions";

export function SubmitClaimForm({ claimId }: { claimId: string }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <button
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        onClick={() => setConfirmed(true)}
        type="button"
      >
        Submit training session
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        After submission, this training session and its activities can no longer be edited.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <form action={submitClaim}>
          <input name="claimId" type="hidden" value={claimId} />
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            type="submit"
          >
            Confirm submission
          </button>
        </form>
        <button
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
          onClick={() => setConfirmed(false)}
          type="button"
        >
          Keep editing
        </button>
      </div>
    </div>
  );
}
