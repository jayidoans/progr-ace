import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/types/database";
import { requiresPasswordGate } from "@/src/features/auth/password-enforcement";
import {
  createPerformanceRequestContext,
  getPerformanceDiagnosticSettings,
  measureAsync,
  PERFORMANCE_CORRELATION_HEADER,
  PERFORMANCE_ROUTE_HEADER,
  type PerformanceRequestContext,
  type PerformanceRoute,
  withPerformanceRequestContext,
} from "@/src/features/performance/diagnostics";

const programIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function trainingDiagnosticRoute(pathname: string): PerformanceRoute | null {
  if (pathname === "/dashboard/training") return "dashboard.training";
  if (programIdPattern.test(pathname.slice("/dashboard/training/".length))) {
    return "dashboard.training.program";
  }
  return null;
}

export async function updateSession(request: NextRequest) {
  const route = trainingDiagnosticRoute(request.nextUrl.pathname);
  const settings = getPerformanceDiagnosticSettings();
  const context = settings.enabled && route
    ? createPerformanceRequestContext(route, request.headers)
    : null;
  const nextResponse = () => {
    const hasClientDiagnosticHeaders = request.headers.has(PERFORMANCE_CORRELATION_HEADER)
      || request.headers.has(PERFORMANCE_ROUTE_HEADER);
    if (!context && !hasClientDiagnosticHeaders) return NextResponse.next({ request });

    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(PERFORMANCE_CORRELATION_HEADER);
    requestHeaders.delete(PERFORMANCE_ROUTE_HEADER);
    if (context) {
      requestHeaders.set(PERFORMANCE_CORRELATION_HEADER, context.correlationId);
      requestHeaders.set(PERFORMANCE_ROUTE_HEADER, context.route);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  };
  const diagnosticSettings = context ? settings : { ...settings, enabled: false };

  return measureAsync(
    withPerformanceRequestContext(
      { route: route ?? "dashboard.training", workflow: "supabase.middleware", operation: "workflow" },
      context,
    ),
    () => updateSessionWithDiagnostics(request, nextResponse, context, diagnosticSettings),
    diagnosticSettings,
  );
}

async function updateSessionWithDiagnostics(
  request: NextRequest,
  nextResponse: () => NextResponse,
  context: PerformanceRequestContext | null,
  diagnosticSettings: ReturnType<typeof getPerformanceDiagnosticSettings>,
) {
  let response = nextResponse();
  const { supabasePublishableKey, supabaseUrl } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = nextResponse();

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser verifies the JWT and refreshes an expired session when possible.
  const { data: { user } } = await measureAsync(
    withPerformanceRequestContext(
      { route: context?.route ?? "dashboard.training", workflow: "supabase.middleware", operation: "auth-get-user", queryCount: 1 },
      context,
    ),
    async () => await supabase.auth.getUser(),
    diagnosticSettings,
  );

  if (user) {
    if (requiresPasswordGate(request.nextUrl.pathname)) {
      const { data: mustChange, error: passwordStatusError } = await measureAsync(
        withPerformanceRequestContext(
          { route: context?.route ?? "dashboard.training", workflow: "supabase.middleware", operation: "password-change-requirement", queryCount: 1 },
          context,
        ),
        async () => await supabase.rpc("current_user_must_change_password"),
        diagnosticSettings,
      );
      if (passwordStatusError || mustChange) {
        const url = request.nextUrl.clone();
        url.pathname = "/account/change-password";
        url.search = "";
        const redirect = NextResponse.redirect(url);
        response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
        return redirect;
      }
    }
  }

  return response;
}
