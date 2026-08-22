import type { InstanceConfig, InstanceTarget } from './model';

const LABEL = /^[\p{L}\p{N}][\p{L}\p{N} ._:-]{0,119}$/u;
const DISTRO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const HOST = /^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/;
const USER = /^[A-Za-z_][A-Za-z0-9._-]{0,63}$/;

const DEFAULT_CONFIG: InstanceConfig = {
  schemaVersion: 1,
  target: 'local-wsl2',
  label: 'Local GitLab',
  port: 8080,
  distro: 'Ubuntu',
};

function requireString(value: unknown, field: string, pattern: RegExp): string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error(`${field} is invalid.`);
  return value;
}

function requirePort(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 65535) throw new Error('port must be between 1 and 65535.');
  return Number(value);
}

export function defaultConfiguration(): InstanceConfig { return DEFAULT_CONFIG; }

/** Validate untrusted renderer JSON and return a fresh, JSON-safe config. */
export function parseInstanceConfig(value: unknown): InstanceConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuration must be an object.');
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) throw new Error('Unsupported configuration schema.');
  const target = candidate.target;
  if (target !== 'local-wsl2' && target !== 'local-docker' && target !== 'remote-ssh') throw new Error('Unsupported instance target.');
  const config: InstanceConfig = {
    schemaVersion: 1,
    target: target as InstanceTarget,
    label: requireString(candidate.label, 'label', LABEL),
    port: requirePort(candidate.port),
  };
  if (target === 'local-wsl2') return { ...config, distro: requireString(candidate.distro, 'distro', DISTRO) };
  if (target === 'remote-ssh') {
    return {
      ...config,
      host: requireString(candidate.host, 'host', HOST),
      user: requireString(candidate.user, 'user', USER),
    };
  }
  return config;
}

export function redactInstanceConfig(config: InstanceConfig): InstanceConfig {
  return { ...config };
}
