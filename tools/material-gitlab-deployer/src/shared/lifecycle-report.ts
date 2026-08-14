import type { LifecycleResult, DoctorReport, WorkflowPlan } from './lifecycle';

export type LifecycleReport = LifecycleResult | DoctorReport | WorkflowPlan;

export function summarizeLifecycle(report: LifecycleReport): string {
  if ('canPlan' in report) return report.canPlan ? 'Local preflight is ready for explicit approval.' : 'Local preflight is blocked; no host was contacted.';
  if ('steps' in report) return report.state === 'ready' ? 'Workflow plan is ready for explicit approval.' : `Workflow plan is ${report.state}; no host was contacted.`;
  return report.state === 'ready' ? 'Local capabilities are available.' : 'Local capabilities are unavailable; no host was contacted.';
}
