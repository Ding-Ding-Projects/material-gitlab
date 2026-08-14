import { RegexBuilder } from './regex-builder';

export const COMMAND_PALETTE_SHORTCUT = 'Ctrl+Shift+F';
const COMMAND_ID = /^command\.[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
const cloneCommand = ({ action, teleport, ...command }) => ({ ...command });

export function createCommandPalette({
  target = globalThis,
  shortcut = COMMAND_PALETTE_SHORTCUT,
  maxResults = 100,
} = {}) {
  const commands = new Map();
  const listeners = new Set();
  const builder = new RegexBuilder();
  let state = { open: false, query: '', results: [], activeId: null, shortcut };
  const snapshot = () => ({
    ...state,
    results: state.results.map(cloneCommand),
    search: builder.snapshot(),
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));

  function search(query = state.query) {
    state.query = String(query);
    builder.update({
      sample: [...commands.values()]
        .map(({ title, keywords = [] }) => `${title} ${keywords.join(' ')}`)
        .join('\n'),
    });
    const searchState = builder.snapshot();
    let matcher;
    if (searchState.regex) {
      try {
        matcher = new RegExp(searchState.pattern, searchState.flags.replace(/[gy]/g, ''));
      } catch (_error) {
        matcher = null;
      }
    }
    const plain = state.query.toLocaleLowerCase();
    state.results = [...commands.values()]
      .filter((command) => {
        const haystack = `${command.title} ${(command.keywords || []).join(' ')} ${command.kind || ''}`;
        return matcher ? matcher.test(haystack) : haystack.toLocaleLowerCase().includes(plain);
      })
      .slice(0, maxResults);
    emit();
    return state.results.map(cloneCommand);
  }

  const onKeydown = (event) => {
    if (
      event?.ctrlKey &&
      event?.shiftKey &&
      !event?.altKey &&
      String(event.key).toLocaleLowerCase() === 'f'
    ) {
      event.preventDefault?.();
      api.open();
      return true;
    }
    return false;
  };

  const api = Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    register(command) {
      if (
        !command ||
        !COMMAND_ID.test(command.id || '') ||
        typeof command.title !== 'string' ||
        !command.title.trim()
      )
        throw new Error('Command requires a stable command.* id and title');
      if (commands.has(command.id)) throw new Error(`Command is already registered: ${command.id}`);
      commands.set(command.id, { keywords: [], kind: 'action', ...command });
      search();
      return () => api.unregister(command.id);
    },
    registerMany(values = []) {
      const disposers = values.map((command) => api.register(command));
      return () => disposers.reverse().forEach((dispose) => dispose());
    },
    unregister(id) {
      const removed = commands.delete(id);
      if (removed) search();
      return removed;
    },
    open(query = '') {
      state.open = true;
      builder.setPlainText(query);
      search(query);
      return snapshot();
    },
    close() {
      state = { ...state, open: false, activeId: null };
      emit();
      return snapshot();
    },
    search,
    setSearch({ pattern = '', flags = '', regex = false } = {}) {
      builder.update({ pattern, flags, regex });
      return search(pattern);
    },
    async activate(id, context) {
      const command = commands.get(id);
      if (!command) return { ok: false, status: 'missing', reason: `Unknown command: ${id}` };
      state.activeId = id;
      emit();
      const actionResult =
        typeof command.action === 'function' ? await command.action(context) : undefined;
      const teleportResult =
        typeof command.teleport === 'function'
          ? await command.teleport({ context, command, actionResult })
          : undefined;
      return { ok: true, actionResult, teleportResult };
    },
    handleKeydown: onKeydown,
    dispose() {
      target?.removeEventListener?.('keydown', onKeydown);
      listeners.clear();
      commands.clear();
    },
  });
  target?.addEventListener?.('keydown', onKeydown);
  return api;
}
