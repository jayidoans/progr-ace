"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isDemoDeployment } from "@/src/features/demo/server";
import { createClient } from "@/src/lib/supabase/server";

const roleSchema = z.enum(["ATHLETE", "COACH"]);

type DemoRateLimiter = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

function demoCredential(role: z.infer<typeof roleSchema>) {
  const prefix = role === "ATHLETE" ? "ATHLETE" : "COACH";
  const email = process.env[`PROGRACE_DEMO_${prefix}_EMAIL`]?.trim();
  const password = process.env[`PROGRACE_DEMO_${prefix}_PASSWORD`];
  if (!email || !password) throw new Error("Demo login is not configured.");
  return { email, password };
}

async function opaqueClientKey(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeDemoLoginAttempt() {
  const requestHeaders = await headers();
  const address = requestHeaders.get("cf-connecting-ip") ?? "unknown-client";
  const key = await opaqueClientKey(address);
  const context = await getCloudflareContext({ async: true });
  const limiter = (context.env as CloudflareEnv & {
    DEMO_LOGIN_RATE_LIMITER?: DemoRateLimiter;
  }).DEMO_LOGIN_RATE_LIMITER;
  if (!limiter) throw new Error("Demo login rate limiting is unavailable.");
  return (await limiter.limit({ key })).success;
}

function demoEntryError(code: "rate-limited" | "unavailable"): never {
  redirect(`/?${new URLSearchParams({ demoError: code })}`);
}

export async function enterDemo(formData: FormData) {
  if (!isDemoDeployment()) throw new Error("Demo entry is unavailable outside the demo deployment.");
  const role = roleSchema.safeParse(formData.get("role"));
  if (!role.success) demoEntryError("unavailable");

  let allowed = false;
  try {
    allowed = await consumeDemoLoginAttempt();
  } catch {
    demoEntryError("unavailable");
  }
  if (!allowed) demoEntryError("rate-limited");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(demoCredential(role.data));
  if (error) demoEntryError("unavailable");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
