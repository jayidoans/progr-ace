"use server";

import { z } from "zod";

import { requireAuthenticatedSession } from "@/src/features/auth/session";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().regex(/^[A-Za-z0-9_-]{40,512}$/),
  auth: z.string().regex(/^[A-Za-z0-9_-]{12,512}$/),
});

export async function getPushPublicKey() {
  await requireAuthenticatedSession("/dashboard/profile");
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function isCurrentPushSubscriptionActive(endpoint: string) {
  if (endpoint.length > 2048) return false;
  const { supabase } = await requireAuthenticatedSession("/dashboard/profile");
  const { data, error } = await supabase.rpc("push_subscription_is_active", { p_endpoint: endpoint });
  if (error) throw new Error("Unable to check push notifications on this device.");
  return data;
}

export async function registerCurrentPushSubscription(input: unknown) {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) throw new Error("The browser push subscription is invalid.");
  const { supabase } = await requireAuthenticatedSession("/dashboard/profile");
  const { data, error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.p256dh,
    p_auth: parsed.data.auth,
  });
  if (error || !data) throw new Error("This device could not enable push notifications.");
  return true;
}

export async function revokeCurrentPushSubscription(endpoint: string) {
  if (endpoint.length > 2048) return false;
  const { supabase } = await requireAuthenticatedSession("/dashboard/profile");
  const { data, error } = await supabase.rpc("revoke_push_subscription", { p_endpoint: endpoint });
  if (error) throw new Error("This device could not disable push notifications.");
  return data;
}
