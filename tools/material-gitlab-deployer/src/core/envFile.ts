// Reads and writes the four settings the window may change in the host's .env file. Every
// other line in the file is kept exactly as it was.

export interface HostSettings {
  hostname: string;
  httpPort: number;
  sshPort: number;
  memoryGb: number;
  cpus: number;
}

const KEYS: Record<keyof HostSettings, string> = {
  hostname: 'GITLAB_HOSTNAME',
  httpPort: 'GITLAB_HTTP_PORT',
  sshPort: 'GITLAB_SSH_PORT',
  memoryGb: 'GITLAB_MEMORY_LIMIT',
  cpus: 'GITLAB_CPU_LIMIT',
};

export const DEFAULT_SETTINGS: HostSettings = { hostname: 'localhost', httpPort: 8929, sshPort: 2229, memoryGb: 10, cpus: 4 };

export function readSettings(text: string): HostSettings {
  const value = (key: string) => {
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm'));
    return match ? match[1].trim() : undefined;
  };
  const num = (raw: string | undefined, fallback: number) => {
    const n = Number.parseInt(String(raw ?? '').replace(/g$/i, ''), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    hostname: value(KEYS.hostname) || DEFAULT_SETTINGS.hostname,
    httpPort: num(value(KEYS.httpPort), DEFAULT_SETTINGS.httpPort),
    sshPort: num(value(KEYS.sshPort), DEFAULT_SETTINGS.sshPort),
    memoryGb: num(value(KEYS.memoryGb), DEFAULT_SETTINGS.memoryGb),
    cpus: num(value(KEYS.cpus), DEFAULT_SETTINGS.cpus),
  };
}

export function validateSettings(input: unknown): { ok: true; value: HostSettings } | { ok: false; errors: string[] } {
  const s = input as Partial<HostSettings> | null;
  const errors: string[] = [];
  if (!s || typeof s !== 'object') return { ok: false, errors: ['settings must be an object'] };
  if (typeof s.hostname !== 'string' || !/^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/.test(s.hostname))
    errors.push('hostname');
  const port = (n: unknown) => Number.isInteger(n) && (n as number) >= 1024 && (n as number) <= 65535;
  if (!port(s.httpPort)) errors.push('httpPort');
  if (!port(s.sshPort)) errors.push('sshPort');
  if (s.httpPort === s.sshPort) errors.push('samePorts');
  if (!Number.isInteger(s.memoryGb) || (s.memoryGb as number) < 4 || (s.memoryGb as number) > 256) errors.push('memoryGb');
  if (!Number.isInteger(s.cpus) || (s.cpus as number) < 1 || (s.cpus as number) > 64) errors.push('cpus');
  return errors.length ? { ok: false, errors } : { ok: true, value: s as HostSettings };
}

export function writeSettings(text: string, settings: HostSettings): string {
  const values: Record<string, string> = {
    [KEYS.hostname]: settings.hostname,
    [KEYS.httpPort]: String(settings.httpPort),
    [KEYS.sshPort]: String(settings.sshPort),
    [KEYS.memoryGb]: `${settings.memoryGb}g`,
    [KEYS.cpus]: String(settings.cpus),
  };
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*([A-Z_]+)\s*=/);
    if (match && match[1] in values) {
      seen.add(match[1]);
      return `${match[1]}=${values[match[1]]}`;
    }
    return line;
  });
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  Object.entries(values).forEach(([key, value]) => {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  });
  return `${lines.join('\r\n')}\r\n`;
}
