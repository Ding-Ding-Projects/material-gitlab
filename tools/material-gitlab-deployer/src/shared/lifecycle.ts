import type { DeploymentConfiguration } from './configuration';
import { redactDeploymentConfiguration } from './secret-boundary';
import type { TargetKind } from './model';

export type LifecycleState = 'ready' | 'blocked' | 'cancelled' | 'rolled-back';
export type CapabilityState = 'available' | 'unavailable' | 'not-checked' | 'unknown';

export interface CapabilityCheck {
  readonly id: string;
  readonly label: string;
  readonly state: CapabilityState;
  readonly detail: string;
  /** True when this check performed no remote I/O. */
  readonly localOnly: boolean;
}

export interface LifecycleResult {
  readonly state: LifecycleState;
  readonly target: TargetKind;
  readonly checks: readonly CapabilityCheck[];
  readonly configuration: ReturnType<typeof redactDeploymentConfiguration>;
  readonly warnings: readonly string[];
}

export interface DoctorReport extends LifecycleResult {
  readonly canPlan: boolean;
  readonly recovery: readonly string[];
}

export interface LifecycleStep {
  readonly id: string;
  readonly title: string;
  readonly kind: 'preflight' | 'approval' | 'execute' | 'rollback';
  readonly state: 'pending' | 'ready' | 'skipped';
  readonly detail: string;
}

export interface WorkflowPlan {
  readonly id: string;
  readonly target: TargetKind;
  readonly state: LifecycleState;
  readonly steps: readonly LifecycleStep[];
  readonly configuration: ReturnType<typeof redactDeploymentConfiguration>;
  readonly cancel: { readonly allowed: true; readonly effect: string };
  readonly rollback: { readonly available: true; readonly effect: string };
}

export interface LifecycleProbe {
  /** Probe only the local machine; never contact a configured host. */
  readonly commandAvailable: (command: string) => boolean;
  readonly wslDistributionAvailable?: (distro: string) => boolean;
  readonly dockerContextAvailable?: () => boolean;
}

export interface LifecycleBoundary {
  preflight(config: DeploymentConfiguration): LifecycleResult;
  doctor(config: DeploymentConfiguration): DoctorReport;
  createWorkflowPlan(config: DeploymentConfiguration): WorkflowPlan;
  cancel(plan: WorkflowPlan): WorkflowPlan;
  rollback(plan: WorkflowPlan): WorkflowPlan;
}

const DEFAULT_PROBE: LifecycleProbe = {
  commandAvailable: () => false,
  wslDistributionAvailable: () => false,
  dockerContextAvailable: () => false,
};

function check(id: string, label: string, state: CapabilityState, detail: string): CapabilityCheck {
  return { id, label, state, detail, localOnly: true };
}

function targetChecks(config: DeploymentConfiguration, probe: LifecycleProbe): CapabilityCheck[] {
  const checks: CapabilityCheck[] = [];
  if (config.target.kind === 'wsl2') {
    const wsl = probe.commandAvailable('wsl.exe');
    checks.push(check('wsl-command', 'WSL2 command', wsl ? 'available' : 'unavailable', wsl ? 'wsl.exe is available locally.' : 'wsl.exe is not available on this machine.'));
    const distro = probe.wslDistributionAvailable?.(config.target.distro ?? '') ?? false;
    checks.push(check('wsl-distro', 'WSL2 distribution', distro ? 'available' : 'unknown', distro ? 'The selected distribution is listed locally.' : 'Distribution availability was not verified; no distro was started.'));
    checks.push(check('docker-command', 'Docker command in WSL2', 'not-checked', 'Docker inside WSL2 is not contacted during preflight.'));
  } else if (config.target.kind === 'local-docker') {
    const docker = probe.commandAvailable('docker');
    checks.push(check('docker-command', 'Docker command', docker ? 'available' : 'unavailable', docker ? 'docker is available locally.' : 'docker is not available on this machine.'));
    const context = probe.dockerContextAvailable?.() ?? false;
    checks.push(check('docker-context', 'Local Docker context', context ? 'available' : 'unknown', context ? 'A local Docker context is configured.' : 'Docker context was not verified; no daemon was contacted.'));
  } else {
    const ssh = probe.commandAvailable('ssh');
    checks.push(check('ssh-command', 'SSH client', ssh ? 'available' : 'unavailable', ssh ? 'ssh is available locally.' : 'ssh is not available on this machine.'));
    checks.push(check('ssh-connectivity', 'SSH host connectivity', 'not-checked', 'Remote SSH connectivity is never attempted by this boundary.'));
    checks.push(check('remote-docker', 'Remote Docker daemon', 'not-checked', 'The remote Docker daemon is never contacted by this boundary.'));
  }
  return checks;
}

function hasUnavailable(checks: readonly CapabilityCheck[]): boolean {
  return checks.some((item) => item.state === 'unavailable');
}

export function createLifecycleBoundary(probe: LifecycleProbe = DEFAULT_PROBE): LifecycleBoundary {
  const preflight = (config: DeploymentConfiguration): LifecycleResult => {
    const checks = targetChecks(config, probe);
    return {
      state: hasUnavailable(checks) ? 'blocked' : 'ready',
      target: config.target.kind,
      checks,
      configuration: redactDeploymentConfiguration(config),
      warnings: config.secretRefs.length === 0
        ? ['No OS-vault secret references were supplied; no secret values may be entered into a plan.']
        : ['Secret values remain in the OS credential vault and are never read by preflight.'],
    };
  };

  const doctor = (config: DeploymentConfiguration): DoctorReport => {
    const result = preflight(config);
    return {
      ...result,
      canPlan: result.state === 'ready',
      recovery: result.state === 'ready' ? [] : ['Install or enable the missing local capability, then run Doctor again.', 'No host was contacted and no deployment state was changed.'],
    };
  };

  const createWorkflowPlan = (config: DeploymentConfiguration): WorkflowPlan => {
    const result = preflight(config);
    const blocked = result.state !== 'ready';
    return {
      id: `plan-${config.target.kind}-${Date.now().toString(36)}`,
      target: config.target.kind,
      state: blocked ? 'blocked' : 'ready',
      configuration: result.configuration,
      steps: [
        { id: 'preflight', title: 'Re-check local capability', kind: 'preflight', state: blocked ? 'skipped' : 'ready', detail: 'Repeat local-only checks before any user-approved executor runs.' },
        { id: 'approval', title: 'Require explicit approval', kind: 'approval', state: blocked ? 'skipped' : 'pending', detail: 'A plan never implies permission to execute.' },
        { id: 'execute', title: 'Hand off bounded argv', kind: 'execute', state: blocked ? 'skipped' : 'pending', detail: 'Execution is outside this boundary and must use an approved non-shell executor.' },
        { id: 'rollback', title: 'Restore prior state on failure', kind: 'rollback', state: 'pending', detail: 'Rollback is a modelled recovery action; no remote mutation is performed here.' },
      ],
      cancel: { allowed: true, effect: 'Cancellation marks pending work cancelled and performs no host operation.' },
      rollback: { available: true, effect: 'Rollback records intent to restore a prior snapshot; it never contacts a host from this boundary.' },
    };
  };

  return {
    preflight,
    doctor,
    createWorkflowPlan,
    cancel: (plan) => ({ ...plan, state: 'cancelled', steps: plan.steps.map((step) => step.state === 'pending' ? { ...step, state: 'skipped' as const, detail: 'Cancelled before execution.' } : step) }),
    rollback: (plan) => ({ ...plan, state: 'rolled-back', steps: plan.steps.map((step) => step.id === 'rollback' ? { ...step, state: 'ready' as const, detail: 'Rollback intent recorded locally; no host was contacted.' } : step) }),
  };
}
