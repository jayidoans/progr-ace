// The offline page is intentionally a retry-only surface: it never reads or stores application data.
/* eslint-disable @next/next/no-location-assign-relative-destination -- standalone offline fallback cannot use the Next.js router */
window.setTimeout(() => {
  window.location.assign("/dashboard");
}, 10_000);
