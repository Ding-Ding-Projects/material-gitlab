import { defineConfig } from 'vite';
import { cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);

/**
 * Directories that must reach the build output.
 *
 * Vite emits the entry bundle and whatever it can trace from an import. It does
 * not emit files that are only ever named as strings at runtime, and this site
 * names most of its content that way: the documentation index lists 29 markdown
 * files by path, and the logos are resolved from data rather than imported.
 *
 * The consequence is invisible from every side. The build succeeds, the deploy
 * succeeds, `vite preview` looks perfect because the dev server falls back to
 * serving files from the project root that the build never emitted, and the
 * published site quietly answers 404 for all of them. Measured on the live site
 * before this list grew: data/docs-manifest.json returned 200 while every
 * document it points at, and every logo, returned 404.
 *
 * Vite's own `publicDir` would solve it by moving these under public/, but the
 * completeness inventory, the checks and the documents themselves all name
 * `site/data/...` and `site/docs/...`. Copying keeps one source of truth for
 * those paths instead of two spellings of each.
 */
const COPY_DIRECTORIES = ['data', 'docs', 'assets'];

function copySiteContent() {
  return {
    name: 'material-gitlab-copy-site-content',
    apply: 'build',
    async closeBundle() {
      for (const directory of COPY_DIRECTORIES) {
        const from = resolve(root, directory);
        if (!existsSync(from)) {
          this.error(
            `site/${directory} is missing, so the built site would ship without it and every path naming it would 404.`,
          );
        }
        // Merges into whatever Vite already emitted rather than replacing it,
        // which matters for assets/: the entry bundle and stylesheet live there
        // too, and overwriting that directory would remove them.
        await cp(from, resolve(root, 'dist', directory), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [copySiteContent()],
});
