"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import {
  cancelTrainingProgram,
  deleteDraftTrainingProgram,
  requestTrainingProgramCancellation,
  reviewTrainingProgramCancellation,
} from "./mutations";

function programPath(programId: string) {
  return `/dashboard/training/${programId}`;
}

function feedbackPath(programId: string, kind: "error" | "message", code: string) {
  return `${programPath(programId)}?${new URLSearchParams({ [kind]: code })}`;
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function revalidateProgram(programId: string) {
  revalidatePath("/dashboard/training");
  revalidatePath(programPath(programId));
  revalidatePath(`${programPath(programId)}/progress`);
}

export async function submitTrainingProgramCancellationRequest(formData: FormData) {
  const programId = formValue(formData, "programId");
  await requireAuthenticatedSession(programPath(programId));
  try {
    await requestTrainingProgramCancellation({ programId, reason: formValue(formData, "reason") });
  } catch {
    redirect(feedbackPath(programId, "error", "cancellation-request-failed"));
  }
  revalidateProgram(programId);
  redirect(feedbackPath(programId, "message", "cancellation-requested"));
}

export async function reviewTrainingProgramCancellationRequest(formData: FormData) {
  const programId = formValue(formData, "programId");
  const decision = formValue(formData, "decision");
  await requireAuthenticatedSession(programPath(programId));
  try {
    await reviewTrainingProgramCancellation({
      requestId: formValue(formData, "requestId"),
      decision,
      reviewReason: formValue(formData, "reviewReason") || null,
    });
  } catch {
    redirect(feedbackPath(programId, "error", "cancellation-review-failed"));
  }
  revalidateProgram(programId);
  redirect(feedbackPath(
    programId,
    "message",
    decision === "APPROVED" ? "cancellation-approved" : "cancellation-declined",
  ));
}

export async function submitDirectTrainingProgramCancellation(formData: FormData) {
  const programId = formValue(formData, "programId");
  await requireAuthenticatedSession(programPath(programId));
  try {
    await cancelTrainingProgram({ programId, reason: formValue(formData, "reason") });
  } catch {
    redirect(feedbackPath(programId, "error", "program-cancel-failed"));
  }
  revalidateProgram(programId);
  redirect(feedbackPath(programId, "message", "program-cancelled"));
}

export async function removeDraftTrainingProgram(formData: FormData) {
  const programId = formValue(formData, "programId");
  await requireAuthenticatedSession(programPath(programId));
  try {
    await deleteDraftTrainingProgram({ programId });
  } catch {
    redirect(feedbackPath(programId, "error", "draft-delete-failed"));
  }
  revalidatePath("/dashboard/training");
  redirect("/dashboard/training?message=draft-deleted");
}
