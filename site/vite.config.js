import { defineConfig } from 'vite';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

function copyBundledSiteData() {
  return {
    name: 'copy-bundled-site-data',
    apply: 'build',
    async closeBundle() {
      const output = path.resolve('dist');
      await mkdir(output, { recursive: true });
      for (const directory of ['data', 'docs', 'assets']) {
        await cp(path.resolve(directory), path.join(output, directory), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyBundledSiteData()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: '127.0.0.1',
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    strictPort: true,
  },
});
