import { buildPrograceTemplateV1 } from "@/src/features/training-import/templates/prograce-template-v1";
import { createClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Authentication required", { status: 401 });
  const [{ data: coach }, { data: admin }] = await Promise.all([
    supabase.rpc("has_role", { p_role_code: "COACH" }),
    supabase.rpc("has_role", { p_role_code: "ADMIN" }),
  ]);
  if (!coach && !admin) return new Response("Coach access required", { status: 403 });
  try {
    const workbook = await buildPrograceTemplateV1();
    return new Response(Uint8Array.from(workbook), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=ProgrACE-Training-Template-v1.xlsx", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Template unavailable", { status: 503 });
  }
}
