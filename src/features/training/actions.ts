"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parsePrograceTemplateV1 } from "@/src/features/training-import/parsers/prograce-template-v1";
import {
  UnsafeWorkbookError,
  validateXlsxEnvelope,
  validateXlsxUpload,
} from "@/src/features/training-import/security";
import { PROGRACE_TEMPLATE_VERSION } from "@/src/features/training-import/template";
import {
  addComponentSchema,
  addPrescriptionSchema,
  addWeekSchema,
  createProgramSchema,
  importUploadSchema,
  programIdSchema,
} from "@/src/features/training/schemas";
import { createClient } from "@/src/lib/supabase/server";
import type { Json } from "@/src/types/database";

function pathWithFeedback(path: string, kind: "error" | "message", code: string, detail?: string) {
  const params = new URLSearchParams({ [kind]: code });
  if (detail) params.set("detail", detail.slice(0, 240));
  return `${path}?${params.toString()}`;
}

async function authenticatedContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard/training");
  return { supabase, user };
}

function componentInput(formData: FormData) {
  return {
    componentType: formData.get("componentType"),
    sequenceOrder: formData.get("sequenceOrder"),
    targetDistanceM: formData.get("targetDistanceM"),
    targetDurationSec: formData.get("targetDurationSec"),
    repetitions: formData.get("repetitions"),
    distancePerRepM: formData.get("distancePerRepM"),
    recoveryDurationSec: formData.get("recoveryDurationSec"),
    targetPaceMinSecPerKm: formData.get("targetPaceMinSecPerKm"),
    targetPaceMaxSecPerKm: formData.get("targetPaceMaxSecPerKm"),
    instruction: formData.get("instruction"),
  };
}

function optionalNumber(value: number | null) {
  return value ?? undefined;
}

export async function createTrainingProgram(formData: FormData) {
  const parsed = createProgramSchema.safeParse({
    raceGoalId: formData.get("raceGoalId"),
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) redirect(pathWithFeedback("/dashboard/training/new", "error", "invalid-program"));

  const { supabase, user } = await authenticatedContext();
  const { data, error } = await supabase
    .from("training_programs")
    .insert({
      race_goal_id: parsed.data.raceGoalId,
      name: parsed.data.name,
      description: parsed.data.description,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      created_by: user.id,
      status: "DRAFT",
    })
    .select("id")
    .single();
  if (error || !data) redirect(pathWithFeedback("/dashboard/training/new", "error", "program-create-failed"));
  revalidatePath("/dashboard/training");
  redirect(`/dashboard/training/${data.id}?message=program-created`);
}

export async function addTrainingWeek(formData: FormData) {
  const parsed = addWeekSchema.safeParse({
    programId: formData.get("programId"),
    weekNumber: formData.get("weekNumber"),
    phase: formData.get("phase"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  const programId = typeof formData.get("programId") === "string" ? String(formData.get("programId")) : "";
  if (!parsed.success) redirect(pathWithFeedback(`/dashboard/training/${programId}`, "error", "invalid-week"));
  const { supabase } = await authenticatedContext();
  const { error } = await supabase.from("training_weeks").insert({
    training_program_id: parsed.data.programId,
    week_number: parsed.data.weekNumber,
    phase: parsed.data.phase,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
  });
  if (error) redirect(pathWithFeedback(`/dashboard/training/${parsed.data.programId}`, "error", error.code === "23505" ? "week-exists" : "week-create-failed"));
  revalidatePath(`/dashboard/training/${parsed.data.programId}`);
  redirect(`/dashboard/training/${parsed.data.programId}?message=week-created`);
}

export async function addTrainingPrescription(formData: FormData) {
  const parsed = addPrescriptionSchema.safeParse({
    programId: formData.get("programId"),
    trainingWeekId: formData.get("trainingWeekId"),
    trainingMenu: formData.get("trainingMenu"),
    scheduledDate: formData.get("scheduledDate"),
    title: formData.get("title"),
    description: formData.get("description"),
    ...componentInput(formData),
  });
  const programId = String(formData.get("programId") ?? "");
  if (!parsed.success) redirect(pathWithFeedback(`/dashboard/training/${programId}`, "error", "invalid-prescription"));
  const { supabase } = await authenticatedContext();
  const { error } = await supabase.rpc("create_training_prescription_with_component", {
    p_training_week_id: parsed.data.trainingWeekId,
    p_training_menu: parsed.data.trainingMenu,
    p_scheduled_date: parsed.data.scheduledDate,
    p_title: parsed.data.title,
    p_component_type: parsed.data.componentType,
    p_sequence_order: parsed.data.sequenceOrder,
    p_description: parsed.data.description ?? undefined,
    p_target_distance_m: optionalNumber(parsed.data.targetDistanceM),
    p_target_duration_sec: optionalNumber(parsed.data.targetDurationSec),
    p_repetitions: optionalNumber(parsed.data.repetitions),
    p_distance_per_rep_m: optionalNumber(parsed.data.distancePerRepM),
    p_recovery_duration_sec: optionalNumber(parsed.data.recoveryDurationSec),
    p_target_pace_min_sec_per_km: optionalNumber(parsed.data.targetPaceMinSecPerKm),
    p_target_pace_max_sec_per_km: optionalNumber(parsed.data.targetPaceMaxSecPerKm),
    p_instruction: parsed.data.instruction ?? undefined,
  });
  if (error) redirect(pathWithFeedback(`/dashboard/training/${parsed.data.programId}`, "error", "prescription-create-failed"));
  revalidatePath(`/dashboard/training/${parsed.data.programId}`);
  redirect(`/dashboard/training/${parsed.data.programId}?message=prescription-created`);
}

export async function addPrescriptionComponent(formData: FormData) {
  const parsed = addComponentSchema.safeParse({
    programId: formData.get("programId"),
    prescriptionId: formData.get("prescriptionId"),
    ...componentInput(formData),
  });
  const programId = String(formData.get("programId") ?? "");
  if (!parsed.success) redirect(pathWithFeedback(`/dashboard/training/${programId}`, "error", "invalid-component"));
  const { supabase } = await authenticatedContext();
  const { error } = await supabase.from("prescription_components").insert({
    prescription_id: parsed.data.prescriptionId,
    sequence_order: parsed.data.sequenceOrder,
    component_type: parsed.data.componentType,
    target_distance_m: parsed.data.targetDistanceM,
    target_duration_sec: parsed.data.targetDurationSec,
    repetitions: parsed.data.repetitions,
    distance_per_rep_m: parsed.data.distancePerRepM,
    recovery_duration_sec: parsed.data.recoveryDurationSec,
    target_pace_min_sec_per_km: parsed.data.targetPaceMinSecPerKm,
    target_pace_max_sec_per_km: parsed.data.targetPaceMaxSecPerKm,
    instruction: parsed.data.instruction,
  });
  if (error) redirect(pathWithFeedback(`/dashboard/training/${parsed.data.programId}`, "error", error.code === "23505" ? "component-order-exists" : "component-create-failed"));
  revalidatePath(`/dashboard/training/${parsed.data.programId}`);
  redirect(`/dashboard/training/${parsed.data.programId}?message=component-created`);
}

export async function publishTrainingProgram(formData: FormData) {
  const parsed = programIdSchema.safeParse({ programId: formData.get("programId") });
  if (!parsed.success) redirect("/dashboard/training?error=invalid-program");
  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase
    .from("training_programs")
    .update({ status: "PUBLISHED" })
    .eq("id", parsed.data.programId)
    .eq("status", "DRAFT")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(pathWithFeedback(`/dashboard/training/${parsed.data.programId}`, "error", "publish-failed"));
  revalidatePath("/dashboard/training");
  revalidatePath(`/dashboard/training/${parsed.data.programId}`);
  redirect(`/dashboard/training/${parsed.data.programId}?message=program-published`);
}

export async function uploadTrainingTemplate(formData: FormData) {
  const parsed = importUploadSchema.safeParse({
    raceGoalId: formData.get("raceGoalId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });
  const file = formData.get("template");
  if (!parsed.success || !(file instanceof File)) {
    redirect(pathWithFeedback("/dashboard/training", "error", "invalid-import"));
  }

  const { supabase, user } = await authenticatedContext();
  let buffer: Buffer;
  try {
    validateXlsxUpload(file);
    buffer = Buffer.from(await file.arrayBuffer());
    validateXlsxEnvelope(buffer);
  } catch (error) {
    const detail = error instanceof UnsafeWorkbookError ? error.message : undefined;
    redirect(pathWithFeedback("/dashboard/training", "error", "unsafe-workbook", detail));
  }

  const result = await parsePrograceTemplateV1(buffer!, {
    name: parsed.data.name,
    description: parsed.data.description,
  });
  if (!result.plan) {
    redirect(pathWithFeedback("/dashboard/training", "error", "parse-failed", result.errors[0]?.message));
  }

  const sourceHash = createHash("sha256").update(buffer!).digest("hex");
  const insertResult = await supabase
    .from("training_import_previews")
    .insert({
      created_by: user.id,
      race_goal_id: parsed.data.raceGoalId,
      source_hash: sourceHash,
      template_version: PROGRACE_TEMPLATE_VERSION,
      payload: result.plan as unknown as Json,
      warnings: result.warnings as unknown as Json,
    })
    .select("id, imported_program_id")
    .single();

  if (insertResult.error?.code === "23505") {
    const { data: existing } = await supabase
      .from("training_import_previews")
      .select("id, imported_program_id")
      .eq("race_goal_id", parsed.data.raceGoalId)
      .eq("source_hash", sourceHash)
      .maybeSingle();
    if (existing?.imported_program_id) redirect(`/dashboard/training/${existing.imported_program_id}?message=import-already-confirmed`);
    if (existing) redirect(`/dashboard/training/import/${existing.id}`);
  }
  if (insertResult.error || !insertResult.data) {
    redirect(pathWithFeedback("/dashboard/training", "error", "preview-create-failed"));
  }
  redirect(`/dashboard/training/import/${insertResult.data.id}`);
}

export async function confirmTrainingImport(formData: FormData) {
  const previewId = formData.get("previewId");
  if (typeof previewId !== "string") redirect("/dashboard/training?error=invalid-preview");
  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase.rpc("confirm_training_import", { p_preview_id: previewId });
  if (error || !data) redirect(pathWithFeedback(`/dashboard/training/import/${previewId}`, "error", "import-failed"));
  revalidatePath("/dashboard/training");
  redirect(`/dashboard/training/${data}?message=import-confirmed`);
}
