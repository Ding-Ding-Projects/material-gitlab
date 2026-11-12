// Squirrel RELEASES lines look like "<SHA1> <file name> <size>". The updater only accepts a
// full package whose name and SHA-1 match the published index.
export interface ReleaseEntry {
  sha1: string;
  file: string;
  size: number;
}

export function parseReleases(text: string): ReleaseEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^﻿/, '').trim().split(/\s+/))
    .filter((parts) => parts.length === 3 && /^[0-9A-Fa-f]{40}$/.test(parts[0]) && /\.nupkg$/.test(parts[1]))
    .map(([sha1, file, size]) => ({ sha1: sha1.toUpperCase(), file, size: Number(size) }));
}

export function versionOf(file: string): string | null {
  const match = file.match(/-(\d+\.\d+\.\d+)-full\.nupkg$/);
  return match ? match[1] : null;
}

export function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}
