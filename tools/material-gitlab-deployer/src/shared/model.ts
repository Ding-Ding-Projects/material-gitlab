export type TargetKind = 'wsl2' | 'local-docker' | 'ssh-docker';

export interface TargetConfig {
  kind: TargetKind;
  label: string;
  distro?: string;
  host?: string;
  user?: string;
  port?: number;
  socket?: string;
}

export interface DeploymentConfig {
  projectPath: string;
  image: string;
  target: TargetConfig;
  environment: Record<string, string>;
  secretRefs: string[];
}

export interface PlanStep {
  id: string;
  title: string;
  command: string;
  args: string[];
  sensitive: boolean;
  rationale: string;
}

export interface CommandPlan {
  target: TargetKind;
  steps: PlanStep[];
  redactions: string[];
}

export const TARGET_LABELS: Record<TargetKind, string> = {
  wsl2: 'WSL2 distribution',
  'local-docker': 'Local Docker Engine',
  'ssh-docker': 'SSH Docker host',
};

export function redactConfig(config: DeploymentConfig): DeploymentConfig {
  return {
    ...config,
    environment: Object.fromEntries(Object.keys(config.environment).map((key) => [key, '••••••'])),
    secretRefs: config.secretRefs.map((ref) => `secret:${ref}`),
  };
}
