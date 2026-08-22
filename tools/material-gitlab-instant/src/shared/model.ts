export type InstanceTarget = 'local-wsl2' | 'local-docker' | 'remote-ssh';

export interface InstanceConfig {
  readonly schemaVersion: 1;
  readonly target: InstanceTarget;
  readonly label: string;
  readonly port: number;
  readonly distro?: string;
  readonly host?: string;
  readonly user?: string;
}

export type ReadinessState = 'ready' | 'not-ready' | 'unsupported';

export interface ReadinessResult {
  readonly state: ReadinessState;
  readonly target: InstanceTarget;
  readonly checkedAt: string;
  readonly url?: string;
  readonly reason: string;
  readonly detail?: string;
}

export interface GitlabInstantApi {
  getConfiguration(): Promise<InstanceConfig>;
  saveConfiguration(config: InstanceConfig): Promise<InstanceConfig>;
  checkReadiness(config?: InstanceConfig): Promise<ReadinessResult>;
  openInstance(): Promise<{ opened: boolean; url?: string; reason?: string }>;
}

declare global {
  interface Window {
    readonly gitlabInstant: GitlabInstantApi;
  }
}
