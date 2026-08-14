/**
 * Safe, non-executing command-plan construction for the deployer.
 *
 * This module deliberately returns argv and environment data instead of a
 * shell command string. Callers can hand the plan to a process API that does
 * not invoke a shell, while the UI can display the redacted preview first.
 */

export type FlagValue = string | boolean;

export interface CommandDefinition {
  /** Tokens that are always placed immediately after the executable. */
  readonly subcommand: readonly string[];
  /** Long or short flags accepted by this command (for example `--project`). */
  readonly allowedFlags: readonly string[];
  readonly requiredFlags?: readonly string[];
  readonly maxPositionals?: number;
}

export interface CommandPolicy {
  /** Exact executable name or path. It is never looked up through PATH. */
  readonly executable: string;
  readonly commands: Readonly<Record<string, CommandDefinition>>;
  /** Environment keys may be forwarded, but are always redacted in previews. */
  readonly allowedEnvironmentKeys?: readonly string[];
}

export interface CommandRequest {
  readonly command: string;
  readonly flags?: Readonly<Record<string, FlagValue>>;
  readonly positionals?: readonly string[];
  readonly environment?: Readonly<Record<string, string>>;
  readonly cwd?: string;
}

export interface CommandPlan {
  readonly executable: string;
  readonly argv: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
  readonly cwd?: string;
  readonly preview: string;
}

const UNSAFE_TOKEN = /[\u0000-\u001f\u007f;&|<>`$(){}]/u;
const FLAG_NAME = /^-{1,2}[A-Za-z][A-Za-z0-9-]*$/u;
const ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;

function requireSafeToken(value: string, label: string): void {
  if (!value || UNSAFE_TOKEN.test(value)) {
    throw new Error(`${label} contains an empty or unsafe token`);
  }
}

function requireFlagName(value: string, label: string): void {
  if (!FLAG_NAME.test(value)) {
    throw new Error(`${label} is not a valid flag name`);
  }
}

function quotePreview(value: string): string {
  // JSON quoting is unambiguous and does not suggest that the preview should
  // be pasted into a shell.
  return JSON.stringify(value);
}

function freezeRecord<T extends Record<string, unknown>>(record: T): Readonly<T> {
  return Object.freeze(record);
}

/**
 * Build a validated argv plan. This function never starts a process and never
 * invokes a shell. Unknown commands, flags, environment keys, and malformed
 * values fail closed before a plan is returned.
 */
export function buildCommandPlan(policy: CommandPolicy, request: CommandRequest): CommandPlan {
  requireSafeToken(policy.executable, "executable");
  requireSafeToken(request.command, "command");

  const definition = policy.commands[request.command];
  if (!definition) {
    throw new Error(`command is not allowlisted: ${request.command}`);
  }

  const allowedFlags = new Set(definition.allowedFlags);
  const suppliedFlags = request.flags ?? {};
  const flagTokens: string[] = [];
  const seenFlags = new Set<string>();

  for (const flag of Object.keys(suppliedFlags).sort()) {
    requireFlagName(flag, `flag ${flag}`);
    if (!allowedFlags.has(flag)) {
      throw new Error(`flag is not allowlisted for ${request.command}: ${flag}`);
    }
    const value = suppliedFlags[flag];
    if (typeof value === "boolean") {
      if (value) flagTokens.push(flag);
    } else {
      requireSafeToken(value, `value for ${flag}`);
      flagTokens.push(flag, value);
    }
    seenFlags.add(flag);
  }

  for (const requiredFlag of definition.requiredFlags ?? []) {
    requireFlagName(requiredFlag, `required flag ${requiredFlag}`);
    if (!seenFlags.has(requiredFlag) || suppliedFlags[requiredFlag] === false) {
      throw new Error(`required flag is missing for ${request.command}: ${requiredFlag}`);
    }
  }

  const positionals = [...(request.positionals ?? [])];
  if (definition.maxPositionals !== undefined && positionals.length > definition.maxPositionals) {
    throw new Error(`too many positional arguments for ${request.command}`);
  }
  positionals.forEach((value, index) => requireSafeToken(value, `positional argument ${index + 1}`));

  const allowedEnvironment = new Set(policy.allowedEnvironmentKeys ?? []);
  const environment: Record<string, string> = {};
  for (const key of Object.keys(request.environment ?? {}).sort()) {
    if (!ENVIRONMENT_NAME.test(key) || !allowedEnvironment.has(key)) {
      throw new Error(`environment key is not allowlisted: ${key}`);
    }
    const value = request.environment?.[key] ?? "";
    requireSafeToken(value, `environment value for ${key}`);
    environment[key] = value;
  }

  if (request.cwd !== undefined) requireSafeToken(request.cwd, "working directory");

  const argv = Object.freeze([
    ...definition.subcommand,
    ...flagTokens,
    ...positionals,
  ]);
  const frozenEnvironment = freezeRecord(environment);
  const previewEnvironment = Object.keys(frozenEnvironment)
    .sort()
    .map((key) => `${key}=<redacted>`)
    .join(" ");
  const preview = [
    [policy.executable, ...argv].map(quotePreview).join(" "),
    previewEnvironment ? `env { ${previewEnvironment} }` : "",
    request.cwd === undefined ? "" : `cwd ${quotePreview(request.cwd)}`,
  ]
    .filter(Boolean)
    .join(" ");

  return Object.freeze({
    executable: policy.executable,
    argv,
    environment: frozenEnvironment,
    ...(request.cwd === undefined ? {} : { cwd: request.cwd }),
    preview,
  });
}

