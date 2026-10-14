// OpenNext creates this module during the build.
// @ts-ignore The generated worker is absent during Next.js compilation.
import handler from "./.open-next/worker.js";

// The public demo intentionally has no scheduled handler. Web Push delivery,
// training reminders, and other background writes stay disabled.
export default {
  fetch: handler.fetch,
};
