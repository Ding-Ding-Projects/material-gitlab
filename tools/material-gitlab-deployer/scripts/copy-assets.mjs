import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(resolve(root, 'dist/renderer'), { recursive: true });
await Promise.all([
  cp(resolve(root, 'src/renderer/index.html'), resolve(root, 'dist/renderer/index.html')),
  cp(resolve(root, 'src/renderer/styles.css'), resolve(root, 'dist/renderer/styles.css')),
]);
