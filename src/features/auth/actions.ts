"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSiteUrl } from "@/src/lib/supabase/env";
import { createClient } from "@/src/lib/supabase/server";
import { ACTIVE_MODE_STORAGE_KEY } from "@/src/features/navigation/active-mode";

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const registrationSchema = credentialsSchema
  .extend({
    fullName: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters.")
      .max(100, "Name must contain at most 100 characters."),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(72, "Password must contain at most 72 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the submitted information.";
}

function authPath(path: "/login" | "/register", key: "error" | "message", value: string) {
  const params = new URLSearchParams({ [key]: value });
  return `${path}?${params.toString()}`;
}

function safeNextPath(value: FormDataEntryValue | null) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/dashboard";
  }

  return value;
}

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(authPath("/login", "error", firstIssue(parsed.error)));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(authPath("/login", "error", "Invalid email or password."));
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function register(formData: FormData) {
  const parsed = registrationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect(authPath("/register", "error", firstIssue(parsed.error)));
  }

  const supabase = await createClient();
  const siteUrl = getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(authPath("/register", "error", error.message));
  }

  revalidatePath("/", "layout");

  if (data.session) {
    redirect("/dashboard");
  }

  redirect(authPath("/login", "message", "Check your email to confirm your account."));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_MODE_STORAGE_KEY);
  revalidatePath("/", "layout");
  redirect("/login");
}
