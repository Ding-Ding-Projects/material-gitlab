export type DeploymentLifecycleStage = 'draft' | 'validated' | 'planned' | 'cancelled' | 'rolled-back';

const TRANSITIONS: Record<DeploymentLifecycleStage, readonly DeploymentLifecycleStage[]> = {
  draft: ['validated', 'cancelled'],
  validated: ['planned', 'cancelled'],
  planned: ['cancelled', 'rolled-back'],
  cancelled: [],
  'rolled-back': [],
};

export function canTransitionLifecycle(from: DeploymentLifecycleStage, to: DeploymentLifecycleStage): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertLifecycleTransition(from: DeploymentLifecycleStage, to: DeploymentLifecycleStage): void {
  if (!canTransitionLifecycle(from, to)) throw new Error(`Lifecycle transition is not allowed: ${from} -> ${to}.`);
}

export function isTerminalStage(stage: DeploymentLifecycleStage): boolean {
  return TRANSITIONS[stage].length === 0;
}
