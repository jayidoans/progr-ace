export const DEMO_DEPLOYMENT_MODE = "demo";

export type DemoRestrictedFeature =
  | "admin"
  | "domain-mutations"
  | "password-management"
  | "push"
  | "registration"
  | "strava";

export type DemoEnvironment = {
  enabled: boolean;
  referenceDate: string | null;
  restrictions: ReadonlySet<DemoRestrictedFeature>;
};

const DEMO_RESTRICTIONS = new Set<DemoRestrictedFeature>([
  "admin",
  "domain-mutations",
  "password-management",
  "push",
  "registration",
  "strava",
]);

function validReferenceDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function resolveDemoEnvironment(
  env: Record<string, string | undefined>,
): DemoEnvironment {
  const enabled = env.PROGRACE_DEPLOYMENT_MODE === DEMO_DEPLOYMENT_MODE;
  if (!enabled) {
    return { enabled: false, referenceDate: null, restrictions: new Set() };
  }
  if (!validReferenceDate(env.PROGRACE_DEMO_REFERENCE_DATE)) {
    throw new Error("Demo deployment requires a valid PROGRACE_DEMO_REFERENCE_DATE.");
  }
  return {
    enabled: true,
    referenceDate: env.PROGRACE_DEMO_REFERENCE_DATE!,
    restrictions: DEMO_RESTRICTIONS,
  };
}

export function demoFeatureAvailable(
  environment: DemoEnvironment,
  feature: DemoRestrictedFeature,
) {
  return !environment.restrictions.has(feature);
}

export function applicationToday(environment: DemoEnvironment, now: Date) {
  return environment.referenceDate ?? now.toISOString().slice(0, 10);
}
