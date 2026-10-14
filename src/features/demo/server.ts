import "server-only";

import {
  applicationToday,
  demoFeatureAvailable,
  resolveDemoEnvironment,
  type DemoRestrictedFeature,
} from "./policy";

export function getDemoEnvironment() {
  return resolveDemoEnvironment(process.env);
}

export function isDemoDeployment() {
  return getDemoEnvironment().enabled;
}

export function getApplicationToday(now = new Date()) {
  return applicationToday(getDemoEnvironment(), now);
}

export function assertDemoFeatureAvailable(feature: DemoRestrictedFeature) {
  if (!demoFeatureAvailable(getDemoEnvironment(), feature)) {
    throw new Error("This action is unavailable in the read-only demonstration environment.");
  }
}
