import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";

const HEADERS = ["participant_id", "survey_version", "submitted_at", "sus01", "sus02", "sus03", "sus04", "sus05", "sus06", "sus07", "sus08", "sus09", "sus10", "tm01", "tm02", "tm03", "ev01", "ev02", "ev03", "ac01", "ac02", "ac03", "sus_score", "tm_mean", "ev_mean", "ac_mean"] as const;

function csvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
  const { supabase } = await requireAuthenticatedSession("/dashboard/admin/users");
  const roles = await getCurrentUserRoles();
  if (!roles.includes("ADMIN")) return new Response("Not found", { status: 404 });
  const { data, error } = await supabase.rpc("export_research_survey_responses");
  if (error) return new Response("Unable to export research survey responses.", { status: 500 });
  const csv = [HEADERS.join(","), ...(data ?? []).map((row) => HEADERS.map((header) => csvValue(row[header])).join(","))].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=ProgrACE-Research-Survey-Responses.csv", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
