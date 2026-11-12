import { createFlagStore } from './flags';

// Built-in extensions. They run inside the page with exactly the permissions they declare,
// receive no tokens or secrets, and can each be switched off. Third-party, out-of-process
// extensions are not available in the browser build.

export const EXTENSIONS_STORAGE_KEY = 'material-system.extensions.v1';

const statusFromPage = (doc) =>
  doc.querySelector('[data-testid="ci-icon"]')?.getAttribute('aria-label') || '';

export const BUILT_IN_EXTENSIONS = Object.freeze([
  {
    id: 'pipeline-status-title',
    name: 'Pipeline status in the tab title',
    version: '1.0.0',
    permissions: ['Read the status icon on the current page', 'Change the browser tab title'],
    activate({ doc = document } = {}) {
      if (!/\/-\/pipelines\/\d+/.test(doc.location?.pathname || '')) return () => {};
      const original = doc.title;
      const status = statusFromPage(doc).replace(/^Status:\s*/i, '');
      if (status) doc.title = `[${status}] ${original}`;
      return () => {
        doc.title = original;
      };
    },
  },
  {
    id: 'copy-sha',
    name: 'Copy a commit SHA by clicking it',
    version: '1.0.0',
    permissions: ['Read commit SHAs on the page', 'Write to the clipboard'],
    activate({
      doc = document,
      notify = () => {},
      clipboard = globalThis.navigator?.clipboard,
    } = {}) {
      const onClick = (event) => {
        const sha = event.target.closest?.('.commit-sha');
        if (!sha || !clipboard) return;
        clipboard.writeText(sha.textContent.trim()).then(
          () => notify(),
          () => {},
        );
      };
      doc.addEventListener('click', onClick);
      return () => doc.removeEventListener('click', onClick);
    },
  },
]);

export function createExtensionHost(options = {}) {
  const defaults = Object.fromEntries(BUILT_IN_EXTENSIONS.map(({ id }) => [id, true]));
  const flags = createFlagStore(EXTENSIONS_STORAGE_KEY, defaults, options);
  const running = new Map();
  const sync = (context) => {
    const enabled = flags.get();
    BUILT_IN_EXTENSIONS.forEach((extension) => {
      const on = enabled[extension.id];
      if (on && !running.has(extension.id)) running.set(extension.id, extension.activate(context));
      if (!on && running.has(extension.id)) {
        running.get(extension.id)?.();
        running.delete(extension.id);
      }
    });
  };
  return {
    list: () =>
      BUILT_IN_EXTENSIONS.map(({ activate, ...meta }) => ({
        ...meta,
        enabled: flags.get()[meta.id],
      })),
    start(context) {
      sync(context);
      return flags.subscribe(() => sync(context));
    },
    setEnabled: (id, value) => flags.set(id, value),
    isRunning: (id) => running.has(id),
  };
}
