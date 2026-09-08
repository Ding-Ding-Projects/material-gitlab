import Vue from 'vue';
import { mountAuthenticatedShell, safeNavigationHref } from '~/material_system/mounts';
import { loadSettings } from '~/material_system/settings';

describe('shared shell live navigation', () => {
  let vm;
  afterEach(() => { vm?.$destroy(); document.body.innerHTML = ''; });

  it('uses the palette label/run interface and rejects executable navigation URLs', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const navigate = jest.fn();
    vm = mountAuthenticatedShell(target, { navigate, data: { current_menu_items: [
      { id: 'plan', title: 'Plan', items: [
        { id: 'issues', title: 'Issues', link: '/group/project/-/issues' },
        { id: 'invalid', title: 'Invalid', link: 'javascript:alert(1)' },
      ] },
    ] } });
    await Vue.nextTick();
    const shell = vm.$children[0];
    expect(shell.paletteActions.filter(({ id }) => id.startsWith('navigate-'))).toHaveLength(1);
    expect(shell.paletteActions[0].label).toBe('Issues');
    shell.paletteActions[0].run();
    expect(navigate).toHaveBeenCalledWith(new URL('/group/project/-/issues', window.location.href).href);
    expect(safeNavigationHref('data:text/html,hello')).toBeNull();
    expect(safeNavigationHref('https://user:secret@example.com')).toBeNull();
  });

  it('connects emitted searches to the existing search route under a relative URL root', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const navigate = jest.fn();
    window.gon.relative_url_root = '/gitlab';
    vm = mountAuthenticatedShell(target, { navigate, data: { current_menu_items: [] } });
    await Vue.nextTick();
    const shell = vm.$children[0];
    shell.$emit('search', '  issue & pipeline  ');
    expect(navigate).toHaveBeenCalledWith('/gitlab/search?search=issue%20%26%20pipeline');
    shell.$emit('search', '   ');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('makes both real shell variants reachable through persisted palette actions', async () => {
    const values = new Map();
    const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
    const createTarget = () => { const target = document.createElement('div'); document.body.appendChild(target); return target; };
    vm = mountAuthenticatedShell(createTarget(), { storage });
    expect(vm.$children[0].$options.name).toBe('MaterialShellB');
    vm.$children[0].paletteActions.find(({ id }) => id === 'header-full').run();
    await Vue.nextTick();
    expect(vm.$children[0].$options.name).toBe('MaterialShellA');
    expect(loadSettings(storage).shellVariant).toBe('a');
    vm.$destroy();
    vm = mountAuthenticatedShell(createTarget(), { storage });
    expect(vm.$children[0].$options.name).toBe('MaterialShellA');
    vm.$children[0].paletteActions.find(({ id }) => id === 'header-minimal').run();
    await Vue.nextTick();
    expect(vm.$children[0].$options.name).toBe('MaterialShellB');
  });

  it('keeps the current shell and shows an error when preference persistence fails', async () => {
    const target = document.createElement('div'); document.body.appendChild(target);
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    vm = mountAuthenticatedShell(target, { storage });
    vm.$children[0].paletteActions.find(({ id }) => id === 'header-full').run();
    await Vue.nextTick();
    expect(vm.$children[0].$options.name).toBe('MaterialShellB');
    expect(vm.$el.querySelector('[role="alert"]').textContent).toContain('could not be saved');
  });
});
