"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import { assertDemoFeatureAvailable } from "@/src/features/demo/server";
import { RESEARCH_SURVEY_CODES, RESEARCH_SURVEY_VERSION } from "./domain";
import type { SurveySubmitState } from "./submit-state";

const answersSchema = z.object(Object.fromEntries(RESEARCH_SURVEY_CODES.map((code) => [code.toLowerCase(), z.coerce.number().int().min(1).max(5)])) as Record<string, z.ZodType>);

function isNextControlFlow(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error
    && typeof error.digest === "string" && (error.digest.startsWith("NEXT_REDIRECT") || error.digest.startsWith("NEXT_NOT_FOUND"));
}

export async function submitResearchSurvey(_state: SurveySubmitState, formData: FormData): Promise<SurveySubmitState> {
  let stage = "availability";
  try {
    assertDemoFeatureAvailable("domain-mutations");
    stage = "authentication";
    const { supabase } = await requireAuthenticatedSession("/survey");

    stage = "validation";
    const parsed = answersSchema.safeParse(Object.fromEntries(RESEARCH_SURVEY_CODES.map((code) => [code.toLowerCase(), formData.get(code)])));
    if (!parsed.success) return { error: "Jawab semua 19 pernyataan dengan nilai 1 sampai 5.", submitted: false };
    if (formData.get("consent") !== "yes") return { error: "Persetujuan penelitian diperlukan sebelum survei dikirim.", submitted: false };

    const values = parsed.data as Record<string, number>;
    const args = {
    p_sus01: values.sus01, p_sus02: values.sus02, p_sus03: values.sus03, p_sus04: values.sus04, p_sus05: values.sus05,
    p_sus06: values.sus06, p_sus07: values.sus07, p_sus08: values.sus08, p_sus09: values.sus09, p_sus10: values.sus10,
    p_tm01: values.tm01, p_tm02: values.tm02, p_tm03: values.tm03,
    p_ev01: values.ev01, p_ev02: values.ev02, p_ev03: values.ev03,
    p_ac01: values.ac01, p_ac02: values.ac02, p_ac03: values.ac03,
    p_consent_given: true, p_consent_version: RESEARCH_SURVEY_VERSION,
    };
    stage = "submission";
    const { error } = await supabase.rpc("submit_research_survey_response", args);
    if (error) {
      if (error.code === "23505") return { error: "Anda sudah mengirimkan survei ini. Jawaban tidak dapat diubah.", submitted: true };
      return { error: "Survei tidak dapat disimpan. Silakan coba lagi.", submitted: false };
    }
    stage = "revalidation";
    revalidatePath("/survey");
    return { error: null, submitted: true };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    console.error(JSON.stringify({ event: "research_survey_submit_failed", stage, errorType: error instanceof Error ? error.name : "unknown" }));
    return { error: "Survei tidak dapat disimpan saat ini. Silakan coba lagi.", submitted: false };
  }
}
