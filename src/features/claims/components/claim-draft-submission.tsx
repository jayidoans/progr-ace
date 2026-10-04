"use client";

import { useRef } from "react";

import {
  submitClaimWithNote,
  updateClaimNote,
} from "@/src/features/claims/actions";

type ClaimDraftSubmissionProps = {
  athleteNote: string | null;
  canSubmit: boolean;
  claimId: string;
};

export function ClaimDraftSubmission({ athleteNote, canSubmit, claimId }: ClaimDraftSubmissionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `claim-submission-${claimId}`;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6" aria-labelledby={`training-note-${claimId}`}>
      <h2 className="text-xl font-bold text-gray-950" id={`training-note-${claimId}`}>Training note</h2>
      <p className="mt-1 text-sm text-gray-600">
        Add any context about why the selected Activities represent this workout. This does not change the Activity notes.
      </p>
      <form action={updateClaimNote} className="mt-4">
        <input name="claimId" type="hidden" value={claimId} />
        <textarea
          className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          defaultValue={athleteNote ?? ""}
          maxLength={4000}
          name="athleteNote"
          placeholder="Add optional context about this training session."
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button className="min-h-11 rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" type="submit">
            Save note
          </button>
          <button
            className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={!canSubmit}
            onClick={() => dialogRef.current?.showModal()}
            type="button"
          >
            Submit training session
          </button>
          {!canSubmit ? <p className="text-sm text-gray-600">Add at least one Activity before submitting.</p> : null}
        </div>

        <dialog aria-labelledby={titleId} className="w-[calc(100%-2rem)] max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-black/40" ref={dialogRef}>
          <div className="space-y-5 p-5 sm:p-6">
            <h3 className="text-xl font-bold text-gray-950" id={titleId}>Have you claimed every Activity you need?</h3>
            <p className="text-sm leading-6 text-gray-600">
              After you submit, this training session and its selected Activities can no longer be changed.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                No, keep reviewing
              </button>
              <button
                className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                formAction={submitClaimWithNote}
                type="submit"
              >
                Yes, submit training
              </button>
            </div>
          </div>
        </dialog>
      </form>
    </section>
  );
}
