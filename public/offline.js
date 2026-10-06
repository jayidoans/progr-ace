// The offline page is intentionally a retry-only surface: it never reads or stores application data.
window.setTimeout(() => {
  window.location.assign("/dashboard");
}, 10_000);
