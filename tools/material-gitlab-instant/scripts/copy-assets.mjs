import { access, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src', 'renderer');
const destination = join(root, 'dist', 'renderer');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(join(source, 'index.html'), join(destination, 'index.html'));
await cp(join(source, 'styles.css'), join(destination, 'styles.css'));
try {
  await access(join(source, 'assets'));
  await cp(join(source, 'assets'), join(destination, 'assets'), { recursive: true });
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
