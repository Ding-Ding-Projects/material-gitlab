export const BRIDGE_VERSION = 1 as const;

export type ReadinessState = 'ready' | 'not-ready' | 'unreachable' | 'invalid';

export interface LocalGitLabConfig {
  readonly schemaVersion: 1;
  /** A loopback-only origin. Credentials and arbitrary query strings are forbidden. */
  readonly origin: string;
  readonly readinessPath: string;
}

export interface ReadinessResult {
  readonly state: ReadinessState;
  readonly origin: string;
  readonly checkedAt: string;
  readonly status?: number;
  readonly reason?: 'http-error' | 'timeout' | 'network-error' | 'not-ready' | 'invalid-config';
}

export interface OpenInstanceResult {
  readonly opened: boolean;
  readonly origin: string;
  readonly readiness: ReadinessResult;
}

export interface GitLabInstantBridge {
  readonly version: typeof BRIDGE_VERSION;
  getConfig(): Promise<LocalGitLabConfig>;
  setConfig(config: unknown): Promise<LocalGitLabConfig>;
  checkReadiness(): Promise<ReadinessResult>;
  openVerifiedInstance(): Promise<OpenInstanceResult>;
}

declare global {
  interface Window {
    gitlabInstant?: GitLabInstantBridge;
  }
}
