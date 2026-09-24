"use client";

import { useRef, type ReactNode, type RefObject } from "react";

import {
  removeDraftTrainingProgram,
  reviewTrainingProgramCancellationRequest,
  submitDirectTrainingProgramCancellation,
  submitTrainingProgramCancellationRequest,
} from "@/src/features/training-cancellation/actions";
import {
  cancellationRequestStatusLabel,
  pendingCancellationRequest,
} from "@/src/features/training-cancellation/presentation";
import { formatTrainingDate } from "@/src/features/training/format";
import type { TrainingProgramCancellationRequest } from "@/src/features/training/queries";

const inputClass = "mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";

function readableDate(value: string | null) {
  return value ? formatTrainingDate(value.slice(0, 10)) : "—";
}

function ConfirmationDialog({
  dialogRef,
  title,
  children,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  children: ReactNode;
}) {
  return <dialog aria-labelledby={`${title.replaceAll(" ", "-").toLowerCase()}-title`} className="w-[calc(100%-2rem)] max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-black/40" ref={dialogRef}>
    <div className="space-y-5 p-5 sm:p-6">
      <h2 className="text-xl font-bold text-gray-950" id={`${title.replaceAll(" ", "-").toLowerCase()}-title`}>{title}</h2>
      {children}
    </div>
  </dialog>;
}

function RequestCancellationDialog({ programId }: { programId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <>
    <button className="min-h-11 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => dialogRef.current?.showModal()} type="button">Request Cancellation</button>
    <ConfirmationDialog dialogRef={dialogRef} title="Request program cancellation?">
      <p className="text-sm text-gray-600">Tell your coach why you would like to stop this training program. Your program will remain active until your coach reviews the request.</p>
      <form action={submitTrainingProgramCancellationRequest} className="space-y-5">
        <input name="programId" type="hidden" value={programId} />
        <label className="block text-sm font-medium text-gray-800">Reason for cancellation
          <textarea aria-describedby="cancellation-request-help" className={inputClass} maxLength={1000} name="reason" placeholder="Share enough context to help your coach review the request." required rows={5} />
          <span className="mt-1 block text-xs font-normal text-gray-500" id="cancellation-request-help">Share enough context to help your coach review the request. Please do not include sensitive medical details.</span>
        </label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => dialogRef.current?.close()} type="button">Keep Program</button>
          <button className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500" type="submit">Submit Request</button>
        </div>
      </form>
    </ConfirmationDialog>
  </>;
}

function ReviewRequestDialog({
  programId,
  request,
  decision,
}: {
  programId: string;
  request: TrainingProgramCancellationRequest;
  decision: "APPROVED" | "DECLINED";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const approving = decision === "APPROVED";
  const actionLabel = approving ? "Approve Cancellation" : "Decline Request";
  return <>
    <button className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold ${approving ? "bg-red-600 text-white hover:bg-red-500" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`} onClick={() => dialogRef.current?.showModal()} type="button">{actionLabel}</button>
    <ConfirmationDialog dialogRef={dialogRef} title={approving ? "Approve cancellation?" : "Decline cancellation request?"}>
      <p className="text-sm text-gray-600">{approving ? "This will end the athlete's active training program. Training history will remain available, but sessions from the cancellation date onward will no longer be expected." : "The training program will remain active."}</p>
      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700"><p className="font-semibold text-gray-950">Athlete&apos;s reason</p><p className="mt-1 whitespace-pre-wrap break-words">{request.request_reason}</p></div>
      <form action={reviewTrainingProgramCancellationRequest} className="space-y-5">
        <input name="programId" type="hidden" value={programId} />
        <input name="requestId" type="hidden" value={request.id} />
        <input name="decision" type="hidden" value={decision} />
        <label className="block text-sm font-medium text-gray-800">Review note <span className="font-normal text-gray-500">(optional)</span>
          <textarea className={inputClass} maxLength={1000} name="reviewReason" placeholder="Add an optional note for the athlete about this decision." rows={4} />
        </label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => dialogRef.current?.close()} type="button">Keep Reviewing</button>
          <button className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold ${approving ? "bg-red-600 text-white hover:bg-red-500" : "bg-gray-900 text-white hover:bg-gray-700"}`} type="submit">{actionLabel}</button>
        </div>
      </form>
    </ConfirmationDialog>
  </>;
}

function DirectCancellationDialog({ programId }: { programId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <>
    <button className="min-h-11 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => dialogRef.current?.showModal()} type="button">Cancel Program</button>
    <ConfirmationDialog dialogRef={dialogRef} title="Cancel this training program?">
      <p className="text-sm text-gray-600">This will end the athlete&apos;s active training program. Existing training history will be preserved.</p>
      <form action={submitDirectTrainingProgramCancellation} className="space-y-5">
        <input name="programId" type="hidden" value={programId} />
        <label className="block text-sm font-medium text-gray-800">Reason for cancellation
          <textarea aria-describedby="direct-cancellation-help" className={inputClass} maxLength={1000} name="reason" placeholder="Explain why this training program is being ended." required rows={5} />
          <span className="mt-1 block text-xs font-normal text-gray-500" id="direct-cancellation-help">The athlete will be able to see this reason.</span>
        </label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => dialogRef.current?.close()} type="button">Keep Program</button>
          <button className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500" type="submit">Cancel Program</button>
        </div>
      </form>
    </ConfirmationDialog>
  </>;
}

function DeleteDraftDialog({ programId }: { programId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <>
    <button className="min-h-11 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => dialogRef.current?.showModal()} type="button">Delete Draft</button>
    <ConfirmationDialog dialogRef={dialogRef} title="Delete this draft program?">
      <p className="text-sm text-gray-600">This draft has not been published. Deleting it will permanently remove the draft training plan.</p>
      <form action={removeDraftTrainingProgram} className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <input name="programId" type="hidden" value={programId} />
        <button className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => dialogRef.current?.close()} type="button">Keep Draft</button>
        <button className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500" type="submit">Delete Draft</button>
      </form>
    </ConfirmationDialog>
  </>;
}

export function ProgramCancellationExperience({
  programId,
  status,
  cancelledAt,
  cancellationReason,
  requests,
  athleteName,
  canRequest,
  canManage,
  canDeleteDraft,
}: {
  programId: string;
  status: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  requests: TrainingProgramCancellationRequest[];
  athleteName: string;
  canRequest: boolean;
  canManage: boolean;
  canDeleteDraft: boolean;
}) {
  const pending = pendingCancellationRequest(requests);
  const hasHistory = requests.length > 0 || status === "CANCELLED";

  if (!canRequest && !canManage && !canDeleteDraft && !hasHistory) return null;

  return <section aria-label="Program management" className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-xl font-bold text-gray-950">Program management</h2><p className="mt-1 text-sm text-gray-600">Manage this training program while keeping its history available.</p></div>
      <div className="flex flex-wrap gap-3">
        {canDeleteDraft ? <DeleteDraftDialog programId={programId} /> : null}
        {canRequest && !pending ? <RequestCancellationDialog programId={programId} /> : null}
        {canManage && pending ? <><ReviewRequestDialog decision="DECLINED" programId={programId} request={pending} /><ReviewRequestDialog decision="APPROVED" programId={programId} request={pending} /></> : null}
        {canManage && !pending ? <DirectCancellationDialog programId={programId} /> : null}
      </div>
    </div>

    {pending ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Cancellation requested{canManage ? ` by ${athleteName}` : ""}</p><p className="mt-1">{canManage ? "Review the athlete's reason before approving or declining this request." : "Your request is waiting for your coach to review. Your training program remains active until the request is approved."}</p><p className="mt-3 text-xs font-medium">Requested {readableDate(pending.requested_at)}</p><p className="mt-1 whitespace-pre-wrap break-words">{pending.request_reason}</p></div> : null}

    {status === "CANCELLED" ? <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"><p className="font-semibold text-gray-950">Program Cancelled</p><p className="mt-1">This training program ended on {readableDate(cancelledAt)}. Your previous training history is still available.</p>{cancellationReason ? <p className="mt-3 whitespace-pre-wrap break-words"><span className="font-medium">Reason:</span> {cancellationReason}</p> : null}</div> : null}

    {hasHistory ? <details className="rounded-lg border border-gray-200 p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-gray-950">Cancellation History</summary><div className="mt-3 space-y-3">{requests.map((request) => <article className="rounded-lg bg-gray-50 p-3 text-sm" key={request.id}><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold text-gray-950">{cancellationRequestStatusLabel(request.status)}</p><p className="text-xs text-gray-500">Requested {readableDate(request.requested_at)}</p></div><p className="mt-2 whitespace-pre-wrap break-words text-gray-700"><span className="font-medium">Reason:</span> {request.request_reason}</p>{request.status !== "PENDING" ? <div className="mt-2 border-t border-gray-200 pt-2 text-gray-700"><p className="text-xs text-gray-500">Reviewed {readableDate(request.reviewed_at)}</p>{request.review_reason ? <p className="mt-1 whitespace-pre-wrap break-words"><span className="font-medium">Review note:</span> {request.review_reason}</p> : null}</div> : null}</article>)}</div></details> : null}
  </section>;
}
