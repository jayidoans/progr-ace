import { buildPushPayload } from "@block65/webcrypto-web-push";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/src/types/database";

export type PushWorkerEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
};

type Delivery = Database["public"]["Functions"]["claim_push_deliveries"]["Returns"][number];
type Outcome = "DELIVERED" | "GONE" | "RETRY" | "FAILED";

export function classifyPushResponse(status: number): Outcome {
  if (status >= 200 && status < 300) return "DELIVERED";
  if (status === 404 || status === 410) return "GONE";
  if (status === 408 || status === 429 || status >= 500) return "RETRY";
  return "FAILED";
}

function validateEnvironment(env: PushWorkerEnv) {
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("A secure Supabase URL is required for push delivery.");
  }
  if (!env.SUPABASE_SECRET_KEY || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY ||
      !/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$|^https:\/\//.test(env.VAPID_SUBJECT)) {
    throw new Error("Push delivery secrets are not configured.");
  }
  return url.href;
}

function safeTargetPath(path: string | null) {
  return path && /^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(path) ? path : "/dashboard";
}

async function sendPush(delivery: Delivery, env: PushWorkerEnv, send: typeof fetch): Promise<{ outcome: Outcome; status: number | null }> {
  try {
    const endpoint = new URL(delivery.endpoint);
    if (endpoint.protocol !== "https:") return { outcome: "FAILED", status: null };
    const payload = await buildPushPayload({
      data: {
        id: delivery.notification_id,
        title: delivery.title,
        body: "Open ProgrACE to view your notification.",
        targetPath: safeTargetPath(delivery.target_path),
      },
      options: { ttl: 3600 },
    }, {
      endpoint: delivery.endpoint,
      expirationTime: null,
      keys: { p256dh: delivery.p256dh, auth: delivery.auth_secret },
    }, {
      subject: env.VAPID_SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    });
    const response = await send(delivery.endpoint, { ...payload, signal: AbortSignal.timeout(8000) });
    return { outcome: classifyPushResponse(response.status), status: response.status };
  } catch {
    return { outcome: "RETRY", status: null };
  }
}

export async function dispatchPushBatch(env: PushWorkerEnv, send: typeof fetch = fetch) {
  const url = validateEnvironment(env); // Do not claim work if secrets are absent.
  const supabase = createClient<Database>(url, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { data: deliveries, error } = await supabase.rpc("claim_push_deliveries", { p_limit: 5 });
  if (error) throw error;
  for (const delivery of deliveries ?? []) {
    const result = await sendPush(delivery, env, send);
    const { error: finishError } = await supabase.rpc("finish_push_delivery", {
      p_delivery_id: delivery.delivery_id,
      p_outcome: result.outcome,
      p_http_status: result.status,
    });
    if (finishError) throw finishError;
  }
  return deliveries?.length ?? 0;
}
