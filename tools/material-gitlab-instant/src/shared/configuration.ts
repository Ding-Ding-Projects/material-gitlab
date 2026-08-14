import type { LocalGitLabConfig } from './bridge';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const PATH_PATTERN = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/u;
const MAX_PATH_LENGTH = 256;

function invalid(message: string): never {
  throw new Error(`Invalid local GitLab configuration: ${message}`);
}

function parseOrigin(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 256 || raw.length === 0) invalid('origin must be a bounded URL.');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    invalid('origin must be an absolute URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') invalid('origin must use HTTP or HTTPS.');
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) invalid('only loopback hosts are allowed.');
  if (url.username || url.password) invalid('credentials are not allowed.');
  if (url.search || url.hash) invalid('query strings and fragments are not allowed.');
  if (url.port && (!/^\d+$/u.test(url.port) || Number(url.port) < 1 || Number(url.port) > 65535)) {
    invalid('port must be between 1 and 65535.');
  }
  const pathname = url.pathname.replace(/\/+$/u, '');
  if (pathname !== '' && !PATH_PATTERN.test(pathname)) invalid('origin path contains unsupported characters.');
  return `${url.protocol}//${url.host}${pathname}`;
}

function parseReadinessPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_PATH_LENGTH) invalid('readinessPath is required and bounded.');
  if (!PATH_PATTERN.test(raw) || raw.includes('..')) invalid('readinessPath contains unsupported characters.');
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function parseLocalGitLabConfig(value: unknown): LocalGitLabConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('configuration must be an object.');
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) invalid('unsupported schema version.');
  return Object.freeze({
    schemaVersion: 1,
    origin: parseOrigin(candidate.origin),
    readinessPath: parseReadinessPath(candidate.readinessPath),
  });
}

export const DEFAULT_LOCAL_CONFIG: LocalGitLabConfig = Object.freeze({
  schemaVersion: 1,
  origin: 'http://127.0.0.1:8080',
  readinessPath: '/-/readiness',
});

export function readinessUrl(config: LocalGitLabConfig): string {
  return new URL(config.readinessPath, `${config.origin}/`).toString();
}
