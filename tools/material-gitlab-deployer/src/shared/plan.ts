import type { CommandPlan, DeploymentConfig, PlanStep, TargetConfig } from './model';

const SAFE_IMAGE = /^[A-Za-z0-9][A-Za-z0-9./_:@-]{0,254}$/;
const SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9_./\\:-]{0,511}$/;

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function baseSteps(config: DeploymentConfig): PlanStep[] {
  return [
    {
      id: 'preflight',
      title: 'Check target readiness',
      command: 'docker',
      args: ['version', '--format', '{{.Server.Version}}'],
      sensitive: false,
      rationale: 'Confirm the selected Docker endpoint responds before changing anything.',
    },
    {
      id: 'pull',
      title: 'Pull the selected image',
      command: 'docker',
      args: ['pull', config.image],
      sensitive: false,
      rationale: 'Resolve the exact image reference without embedding credentials.',
    },
    {
      id: 'deploy',
      title: 'Apply the deployment',
      command: 'docker',
      args: ['compose', '--project-directory', config.projectPath, 'up', '--detach'],
      sensitive: true,
      rationale: 'Start the project using environment references held outside the command plan.',
    },
  ];
}

function wrapForTarget(steps: PlanStep[], target: TargetConfig): PlanStep[] {
  if (target.kind === 'wsl2') {
    const distro = target.distro ?? 'default';
    return steps.map((step) => ({ ...step, command: 'wsl.exe', args: ['--distribution', distro, '--', step.command, ...step.args] }));
  }
  if (target.kind === 'ssh-docker') {
    const destination = `${target.user ?? 'root'}@${target.host ?? 'localhost'}`;
    return steps.map((step) => ({ ...step, command: 'ssh', args: ['-p', String(target.port ?? 22), destination, '--', step.command, ...step.args] }));
  }
  return steps;
}

export function buildCommandPlan(config: DeploymentConfig): CommandPlan {
  if (!SAFE_IMAGE.test(config.image)) throw new Error('Image reference contains unsupported characters.');
  if (!SAFE_PATH.test(config.projectPath)) throw new Error('Project path contains unsupported characters.');
  if (config.target.kind === 'ssh-docker' && (!config.target.host || !config.target.user)) {
    throw new Error('SSH Docker targets require a host and user.');
  }

  const steps = wrapForTarget(baseSteps(config), config.target);
  return {
    target: config.target.kind,
    steps,
    redactions: [...config.secretRefs, ...Object.keys(config.environment)],
  };
}

export function formatStep(step: PlanStep): string {
  return [step.command, ...step.args.map(quote)].join(' ');
}
