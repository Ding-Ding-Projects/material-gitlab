// The only commands the window can ask for. Each maps to one host.ps1 command; nothing else
// is ever passed to PowerShell.
export const HOST_ACTIONS = Object.freeze({
  start: 'up',
  stop: 'stop',
  health: 'health',
  status: 'status',
  logs: 'logs-tail',
} as const);

export type HostAction = keyof typeof HOST_ACTIONS;

export function isHostAction(value: unknown): value is HostAction {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(HOST_ACTIONS, value);
}

export interface Health {
  docker: 'running' | 'not running' | 'unknown';
  container: string;
  address: string | null;
}

// Parses the "  docker: running", "  container: running healthy", "  address: http://..." lines
// that `host.ps1 health` prints.
export function parseHealth(output: string): Health {
  const read = (key: string) => {
    const match = output.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : null;
  };
  const docker = read('docker');
  const address = read('address');
  return {
    docker: docker === 'running' || docker === 'not running' ? docker : 'unknown',
    container: read('container') || 'absent',
    address: address && /^http:\/\/[A-Za-z0-9.-]+:\d{1,5}$/.test(address) ? address : null,
  };
}

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
