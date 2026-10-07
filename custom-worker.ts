// OpenNext creates this module during the build.
// @ts-ignore The generated worker is absent during Next.js compilation.
import handler from "./.open-next/worker.js";

import { dispatchPushBatch, type PushWorkerEnv } from "./src/features/push/dispatcher";

export default {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: PushWorkerEnv) {
    await dispatchPushBatch(env);
  },
};
