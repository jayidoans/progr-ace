export type PerformanceRoute =
  | "dashboard"
  | "dashboard.training"
  | "dashboard.training.program"
  | "dashboard.coaching.athletes"
  | "dashboard.coaching.athlete";

type DiagnosticEnvironment = "production" | "non-production";
type DiagnosticOutcome = "ok" | "error";

export type PerformanceCounts = Partial<{
  programs: number;
  weeks: number;
  prescriptions: number;
  claims: number;
  components: number;
  athletes: number;
  raceGoals: number;
}>;

type PerformanceInput = {
  route: PerformanceRoute;
  workflow: string;
  operation: string;
  queryCount?: number;
  counts?: PerformanceCounts;
  serializedPayloadBytes?: number | null;
};

type PerformanceInputFactory = PerformanceInput | (() => PerformanceInput);

export type PerformanceDiagnostic = {
  event: "prograce.performance";
  environment: DiagnosticEnvironment;
  diagnosticsEnabled: true;
  route: PerformanceRoute;
  workflow: string;
  operation: string;
  durationMs: number;
  outcome: DiagnosticOutcome;
  queryCount?: number;
  counts?: PerformanceCounts;
  serializedPayloadBytes?: number;
};

export type PerformanceDiagnosticSettings = {
  enabled: boolean;
  environment: DiagnosticEnvironment;
};

const countKeys = new Set<keyof PerformanceCounts>([
  "programs",
  "weeks",
  "prescriptions",
  "claims",
  "components",
  "athletes",
  "raceGoals",
]);

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function millisecondsSince(startedAt: number) {
  return Math.max(0, Math.round(now() - startedAt));
}

function safeInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : undefined;
}

function safeCounts(counts: PerformanceCounts | undefined) {
  if (!counts) return undefined;
  const result: PerformanceCounts = {};
  for (const [key, value] of Object.entries(counts)) {
    if (!countKeys.has(key as keyof PerformanceCounts)) continue;
    const safeValue = safeInteger(value);
    if (safeValue !== undefined) result[key as keyof PerformanceCounts] = safeValue;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function getPerformanceDiagnosticSettings(
  environment: Record<string, string | undefined> = process.env,
): PerformanceDiagnosticSettings {
  return {
    enabled: environment.PROGRACE_PERFORMANCE_DIAGNOSTICS === "1",
    environment: environment.NODE_ENV === "production" ? "production" : "non-production",
  };
}

function toDiagnostic(
  settings: PerformanceDiagnosticSettings,
  input: PerformanceInput,
  startedAt: number,
  outcome: DiagnosticOutcome,
): PerformanceDiagnostic {
  const diagnostic: PerformanceDiagnostic = {
    event: "prograce.performance",
    environment: settings.environment,
    diagnosticsEnabled: true,
    route: input.route,
    workflow: input.workflow,
    operation: input.operation,
    durationMs: millisecondsSince(startedAt),
    outcome,
  };
  const queryCount = safeInteger(input.queryCount);
  const counts = safeCounts(input.counts);
  const serializedPayloadBytes = safeInteger(input.serializedPayloadBytes);
  if (queryCount !== undefined) diagnostic.queryCount = queryCount;
  if (counts) diagnostic.counts = counts;
  if (serializedPayloadBytes !== undefined) diagnostic.serializedPayloadBytes = serializedPayloadBytes;
  return diagnostic;
}

export function emitPerformanceDiagnostic(
  diagnostic: PerformanceDiagnostic,
  write: (message: string) => void = console.info,
) {
  write(JSON.stringify(diagnostic));
}

export async function measureAsync<T>(
  input: PerformanceInputFactory,
  run: () => Promise<T>,
  settings = getPerformanceDiagnosticSettings(),
): Promise<T> {
  if (!settings.enabled) return run();
  const startedAt = now();
  try {
    const result = await run();
    emitPerformanceDiagnostic(toDiagnostic(settings, resolveInput(input), startedAt, "ok"));
    return result;
  } catch (error) {
    emitPerformanceDiagnostic(toDiagnostic(settings, resolveInput(input), startedAt, "error"));
    throw error;
  }
}

export function measureSync<T>(
  input: PerformanceInputFactory,
  run: () => T,
  settings = getPerformanceDiagnosticSettings(),
): T {
  if (!settings.enabled) return run();
  const startedAt = now();
  try {
    const result = run();
    emitPerformanceDiagnostic(toDiagnostic(settings, resolveInput(input), startedAt, "ok"));
    return result;
  } catch (error) {
    emitPerformanceDiagnostic(toDiagnostic(settings, resolveInput(input), startedAt, "error"));
    throw error;
  }
}

function resolveInput(input: PerformanceInputFactory) {
  return typeof input === "function" ? input() : input;
}

export async function measureRouteWorkflow<T>(
  input: Omit<PerformanceInput, "serializedPayloadBytes">,
  run: () => Promise<T>,
  summarize: (result: T) => PerformanceCounts,
  settings = getPerformanceDiagnosticSettings(),
): Promise<T> {
  if (!settings.enabled) return run();
  const startedAt = now();
  try {
    const result = await run();
    const serializedPayloadBytes = estimateSerializedPayloadBytes(result);
    emitPerformanceDiagnostic(toDiagnostic(settings, {
      ...input,
      counts: summarize(result),
      serializedPayloadBytes,
    }, startedAt, "ok"));
    return result;
  } catch (error) {
    emitPerformanceDiagnostic(toDiagnostic(settings, input, startedAt, "error"));
    throw error;
  }
}

export function estimateSerializedPayloadBytes(value: unknown): number | null {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return null;
  }
}
