import type { DeploymentConfig, TargetConfig, TargetKind } from './model';

/** A JSON-safe configuration accepted by the preview shell. */
export interface DeploymentConfiguration extends DeploymentConfig {
  readonly schemaVersion: 1;
}

export type TargetConfiguration = TargetConfig & { readonly kind: TargetKind };

const IMAGE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9./_:@-]{0,254}$/;
const PROJECT_PATH = /^[A-Za-z0-9][A-Za-z0-9_./\\:-]{0,511}$/;
const SECRET_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

function assertString(value: unknown, field: string, maxLength: number): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new Error(`${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
}

function validateTarget(target: unknown): asserts target is TargetConfiguration {
  if (!target || typeof target !== 'object') throw new Error('target must be an object.');
  const candidate = target as Record<string, unknown>;
  if (!['wsl2', 'local-docker', 'ssh-docker'].includes(String(candidate.kind))) {
    throw new Error('target.kind is not supported.');
  }
  assertString(candidate.label, 'target.label', 120);
  if (candidate.kind === 'wsl2') {
    assertString(candidate.distro, 'target.distro', 120);
  }
  if (candidate.kind === 'ssh-docker') {
    assertString(candidate.host, 'target.host', 253);
    assertString(candidate.user, 'target.user', 64);
    if (candidate.port !== undefined && (!Number.isInteger(candidate.port) || Number(candidate.port) < 1 || Number(candidate.port) > 65535)) {
      throw new Error('target.port must be an integer between 1 and 65535.');
    }
  }
}

/** Validate an untrusted JSON value before it enters the deployment planner. */
export function parseDeploymentConfiguration(value: unknown): DeploymentConfiguration {
  if (!value || typeof value !== 'object') throw new Error('Deployment configuration must be an object.');
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) throw new Error('Unsupported deployment configuration schema.');
  assertString(candidate.projectPath, 'projectPath', 512);
  if (!PROJECT_PATH.test(candidate.projectPath)) throw new Error('projectPath contains unsupported characters.');
  assertString(candidate.image, 'image', 255);
  if (!IMAGE_REFERENCE.test(candidate.image)) throw new Error('image contains unsupported characters.');
  validateTarget(candidate.target);
  if (!candidate.environment || typeof candidate.environment !== 'object' || Array.isArray(candidate.environment)) {
    throw new Error('environment must be a string map.');
  }
  const environment: Record<string, string> = {};
  for (const [key, raw] of Object.entries(candidate.environment as Record<string, unknown>)) {
    if (!/^[A-Z_][A-Z0-9_]{0,127}$/.test(key)) throw new Error(`Invalid environment key: ${key}`);
    assertString(raw, `environment.${key}`, 4096);
    environment[key] = raw;
  }
  if (!Array.isArray(candidate.secretRefs) || candidate.secretRefs.some((ref) => typeof ref !== 'string' || !SECRET_REFERENCE.test(ref))) {
    throw new Error('secretRefs must contain only bounded secret references.');
  }
  return {
    schemaVersion: 1,
    projectPath: candidate.projectPath,
    image: candidate.image,
    target: candidate.target,
    environment,
    secretRefs: [...candidate.secretRefs],
  };
}

export function createDeploymentConfiguration(config: Omit<DeploymentConfig, 'secretRefs'> & { secretRefs?: string[] }): DeploymentConfiguration {
  return parseDeploymentConfiguration({ schemaVersion: 1, secretRefs: [], ...config });
}
