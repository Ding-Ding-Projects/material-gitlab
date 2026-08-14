import type { DeploymentConfiguration } from './configuration';

export const REDACTED_SECRET = '••••••';

export type SecretReference = string & { readonly __secretReference: unique symbol };

export function asSecretReference(value: string): SecretReference {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)) {
    throw new Error('Secret references must use bounded identifier characters.');
  }
  return value as SecretReference;
}

/** Replace secret-bearing values without logging, serializing, or retaining the originals. */
export function redactSecret(value: unknown): string {
  return value === undefined || value === null || value === '' ? '' : REDACTED_SECRET;
}

export interface RedactedDeploymentConfiguration {
  readonly schemaVersion: 1;
  readonly projectPath: string;
  readonly image: string;
  readonly target: DeploymentConfiguration['target'];
  readonly environment: Record<string, string>;
  readonly secretRefs: string[];
}

export function redactDeploymentConfiguration(config: DeploymentConfiguration): RedactedDeploymentConfiguration {
  return {
    schemaVersion: 1,
    projectPath: config.projectPath,
    image: config.image,
    target: { ...config.target },
    environment: Object.fromEntries(Object.keys(config.environment).map((key) => [key, REDACTED_SECRET])),
    secretRefs: config.secretRefs.map((reference) => `secret:${reference}`),
  };
}

/** Redact known secret values from command/display text while preserving normal text. */
export function redactText(text: string, secretValues: readonly string[]): string {
  let result = text;
  for (const secret of secretValues) {
    if (secret.length > 0) result = result.split(secret).join(REDACTED_SECRET);
  }
  return result;
}
