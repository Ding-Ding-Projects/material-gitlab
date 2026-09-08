import fs from 'node:fs';
import path from 'node:path';

export function rootReal(root) { return fs.realpathSync(root); }

function contained(root, candidate, label) {
  const rootPath = rootReal(root);
  const real = fs.realpathSync(candidate);
  if (real !== rootPath && !real.startsWith(`${rootPath}${path.sep}`)) throw new Error(`${label} escapes the repository through a symlink or reparse point`);
  return real;
}

export function existingFile(root, relative, label) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) throw new Error(`${label} must be a relative path`);
  const candidate = path.resolve(root, relative);
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) throw new Error(`${label} is missing: ${relative}`);
  return contained(root, candidate, label);
}

export function outputFile(root, relative, label) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) throw new Error(`${label} must be a relative path`);
  const candidate = path.resolve(root, relative);
  let parent = path.dirname(candidate);
  while (!fs.existsSync(parent)) {
    const next = path.dirname(parent);
    if (next === parent) throw new Error(`${label} has no existing parent`);
    parent = next;
  }
  contained(root, parent, `${label} parent`);
  return candidate;
}
