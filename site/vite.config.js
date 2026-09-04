import { cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname);

/**
 * Copy site/data into the build output.
 *
 * Without this the published site 404s on every one of its own JSON manifests
 * -- the documentation index, the feature inventory, the changelog -- while a
 * local `vite preview` looks perfectly healthy, because the dev server falls
 * back to serving files from the project root that the build never emitted.
 * The build stayed green, the deploy stayed green, and the live page quietly
 * showed "Documentation data unavailable: 404 Not Found".
 *
 * Vite's own `publicDir` would solve it by moving data/ under public/, but
 * every path in the completeness inventory, the checks and the docs names
 * `site/data/...`. Copying keeps one source of truth for those paths.
 */
function copySiteData() {
  return {
    name: 'material-gitlab-copy-site-data',
    apply: 'build',
    async closeBundle() {
      const from = resolve(root, 'data');
      const to = resolve(root, 'dist', 'data');
      if (!existsSync(from)) {
        this.error('site/data is missing, so the built site would ship without its manifests.');
      }
      await cp(from, to, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [copySiteData()],
});
