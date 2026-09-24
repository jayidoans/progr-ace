import type { TrainingProgramCancellationRequest } from "@/src/features/training/queries";

export function trainingProgramStatusLabel(status: string) {
  if (status === "DRAFT") return "Draft";
  if (status === "PUBLISHED") return "Published";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "ARCHIVED") return "Archived";
  return status;
}

export function cancellationRequestStatusLabel(status: string) {
  if (status === "PENDING") return "Waiting for review";
  if (status === "APPROVED") return "Approved";
  if (status === "DECLINED") return "Declined";
  return status;
}

export function pendingCancellationRequest(requests: TrainingProgramCancellationRequest[]) {
  return requests.find((request) => request.status === "PENDING") ?? null;
}

export function isAfterCancellationBoundary(scheduledDate: string, cancelledAt: string | null) {
  const cancellationDate = cancelledAt?.slice(0, 10) ?? null;
  return cancellationDate !== null && scheduledDate >= cancellationDate;
}
