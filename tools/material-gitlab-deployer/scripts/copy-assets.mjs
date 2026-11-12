import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The renderer's static files. app.ts is compiled by tsc into dist/renderer/app.js.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(resolve(root, 'dist/renderer'), { recursive: true });
await Promise.all(
  ['index.html', 'styles.css', 'icon.png', 'dimsum.json'].map((file) =>
    cp(resolve(root, 'src/renderer', file), resolve(root, 'dist/renderer', file)),
  ),
);
