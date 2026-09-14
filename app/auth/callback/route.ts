import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL(safeNextPath(requestUrl.searchParams.get("next")), requestUrl.origin),
      );
    }
  }

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", "The authentication link is invalid or has expired.");
  return NextResponse.redirect(loginUrl);
}
