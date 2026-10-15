import { notFound } from "next/navigation";

import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { isDemoDeployment } from "@/src/features/demo/server";
import { RESEARCH_SURVEY_VERSION } from "@/src/features/research-survey/domain";
import { setResearchSurveyCampaign } from "@/src/features/research-survey/admin-actions";

function localDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const jakarta = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return jakarta.toISOString().slice(0, 16);
}

export default async function AdminSurveyPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  if (isDemoDeployment()) notFound();
  const { supabase } = await requireAuthenticatedSession("/dashboard/admin/survey");
  const roles = await getCurrentUserRoles();
  if (!roles.includes("ADMIN")) notFound();
  const [{ data: campaign, error }, params] = await Promise.all([
    supabase.from("research_survey_campaigns").select("is_open,closes_at,updated_at").eq("survey_version", RESEARCH_SURVEY_VERSION).single(),
    searchParams,
  ]);
  if (error || !campaign) throw new Error("Unable to load survey campaign.");
  const currentlyOpen = campaign.is_open && Boolean(campaign.closes_at && new Date(campaign.closes_at).getTime() > Date.now());
  const message = params.message === "opened" ? "Survey opened. Eligible Athlete and Coach accounts have been notified." : params.message === "closed" ? "Survey closed." : params.message === "save-failed" ? "Survey status could not be saved." : params.message === "invalid-close-date" ? "Set a future closing date before opening the survey." : null;
  return <div className="space-y-8"><header><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Admin</p><h1 className="mt-2 text-3xl font-bold">Research Survey</h1><p className="mt-3 max-w-2xl text-gray-600">Open or close the research survey for all authenticated ProgrACE users. Opening a new campaign sends one application notification per account.</p></header>{message ? <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{message}</p> : null}<section className="max-w-xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-gray-500">Current status</dt><dd className="mt-1 font-bold text-gray-950">{currentlyOpen ? "Open" : "Closed"}</dd></div><div><dt className="font-semibold text-gray-500">Closes (WIB)</dt><dd className="mt-1 font-bold text-gray-950">{campaign.closes_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(campaign.closes_at)) : "Not set"}</dd></div></dl><form action={setResearchSurveyCampaign} className="mt-6 space-y-4 border-t border-gray-200 pt-6"><label className="block text-sm font-semibold text-gray-800">Closing date and time (WIB)<input className="mt-2 min-h-11 w-full rounded-md border border-gray-300 px-3 font-normal" defaultValue={localDateTimeValue(campaign.closes_at)} name="closesAt" type="datetime-local" /></label><div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700" name="isOpen" type="submit" value="true">Open survey</button><button className="min-h-11 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50" name="isOpen" type="submit" value="false">Close survey</button></div></form></section></div>;
}
