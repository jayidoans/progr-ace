import "server-only";

import { headers } from "next/headers";

import {
  getPerformanceDiagnosticSettings,
  readPerformanceRequestContext,
  type PerformanceDiagnosticSettings,
  type PerformanceRequestContext,
  type PerformanceRoute,
} from "./diagnostics";

export type ServerPerformanceRequestContext = {
  context: PerformanceRequestContext | null;
  settings: PerformanceDiagnosticSettings;
};

export async function getServerPerformanceRequestContext(
  expectedRoute?: PerformanceRoute,
): Promise<ServerPerformanceRequestContext> {
  const settings = getPerformanceDiagnosticSettings();
  if (!settings.enabled) return { context: null, settings };

  const context = readPerformanceRequestContext(await headers());
  if (!context || (expectedRoute && context.route !== expectedRoute)) {
    return { context: null, settings: { ...settings, enabled: false } };
  }
  return { context, settings };
}
