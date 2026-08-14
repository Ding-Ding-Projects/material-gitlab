import { parseDeploymentConfiguration, type DeploymentConfiguration } from './configuration';
import { createLifecycleBoundary, type LifecycleProbe, type LifecycleResult, type DoctorReport, type WorkflowPlan } from './lifecycle';

export interface LifecycleBoundaryApi {
  preflight(input: unknown): LifecycleResult;
  doctor(input: unknown): DoctorReport;
  plan(input: unknown): WorkflowPlan;
}

/** Main-process API fence: untrusted renderer JSON is parsed before any probe runs. */
export function createLifecycleBoundaryApi(probe?: LifecycleProbe): LifecycleBoundaryApi {
  const boundary = createLifecycleBoundary(probe);
  const parse = (input: unknown): DeploymentConfiguration => parseDeploymentConfiguration(input);
  return {
    preflight: (input) => boundary.preflight(parse(input)),
    doctor: (input) => boundary.doctor(parse(input)),
    plan: (input) => boundary.createWorkflowPlan(parse(input)),
  };
}
