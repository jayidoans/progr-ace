// OpenNext creates this module during the build.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- generated worker is absent before the OpenNext build
// @ts-ignore The generated worker is absent during Next.js compilation.
import handler from "./.open-next/worker.js";

// The public demo intentionally has no scheduled handler. Web Push delivery,
// training reminders, and other background writes stay disabled.
const worker = {
  fetch: handler.fetch,
};

export default worker;
