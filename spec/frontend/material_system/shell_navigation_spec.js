import Vue from 'vue';
import { mountAuthenticatedShell, safeNavigationHref } from '~/material_system/mounts';

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
    expect(shell.paletteActions).toHaveLength(1);
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
});
