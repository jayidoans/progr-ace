// OpenNext creates this module during the build.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- generated worker is absent before the OpenNext build
// @ts-ignore The generated worker is absent during Next.js compilation.
import handler from "./.open-next/worker.js";

import { dispatchPushBatch, type PushWorkerEnv } from "./src/features/push/dispatcher";

const worker = {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: PushWorkerEnv) {
    await dispatchPushBatch(env);
  },
};

export default worker;
