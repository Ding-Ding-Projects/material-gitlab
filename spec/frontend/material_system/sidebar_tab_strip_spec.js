import { mount } from '@vue/test-utils';
import { createTabStripState, TAB_STRIP_STORAGE_KEY } from '~/material_system/tab-strip-state';
import Sidebar from '~/material_system/surfaces/Sidebar/Sidebar.vue';

const mem = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};

describe('tab strip state', () => {
  it('opens every tab on a fresh install', () => {
    const s = createTabStripState(['a', 'b', 'c'], { storage: mem() });
    expect(['a', 'b', 'c'].every(s.isOpen)).toBe(true);
  });
  it('keeps a closed tab closed across restarts and opens only new tabs on update', () => {
    const storage = mem();
    createTabStripState(['a', 'b'], { storage }).close('b');
    const later = createTabStripState(['a', 'b', 'c'], { storage });
    expect(later.isOpen('a')).toBe(true);
    expect(later.isOpen('b')).toBe(false);
    expect(later.isOpen('c')).toBe(true);
    later.openEvery();
    expect(createTabStripState(['a', 'b', 'c'], { storage }).isOpen('b')).toBe(true);
  });
  it('treats a damaged record as a fresh install', () => {
    const storage = mem();
    storage.setItem(TAB_STRIP_STORAGE_KEY, '{nope');
    expect(createTabStripState(['a'], { storage }).isOpen('a')).toBe(true);
  });
});

const sections = [
  { name: '', items: [{ id: 'home', label: 'Home', href: '/' }] },
  {
    name: 'Plan',
    items: [
      { id: 'issues', label: 'Issues', href: '/i' },
      { id: 'boards', label: 'Boards', href: '/b' },
    ],
  },
  { name: 'Code', items: [{ id: 'mrs', label: 'Merge requests', href: '/m' }] },
];
const make = (storage = mem()) =>
  mount(Sidebar, {
    propsData: { sections, active: 'Issues', storage },
    stubs: { RegexBuilder: true },
  });

describe('Sidebar as a left-docked tab strip', () => {
  it('is a vertical tablist with every destination open', () => {
    const w = make();
    const list = w.find('[role="tablist"]');
    expect(list.attributes('aria-orientation')).toBe('vertical');
    expect(w.findAll('[role="tab"]').length).toBe(4);
    expect(w.find('[aria-selected="true"]').text()).toContain('Issues');
    expect(w.find('[data-testid="tab-strip-open-every"]').attributes('disabled')).toBeDefined();
  });
  it('closes a tab, persists it, and reopens with Open every tab', async () => {
    const storage = mem();
    const w = make(storage);
    await w.find('[data-testid="close-tab-boards"]').trigger('click');
    expect(w.findAll('[role="tab"]').length).toBe(3);
    expect(make(storage).findAll('[role="tab"]').length).toBe(3);
    await w.find('[data-testid="tab-strip-open-every"]').trigger('click');
    expect(w.findAll('[role="tab"]').length).toBe(4);
  });
  it('never hides the active tab even if it was closed before', async () => {
    const storage = mem();
    createTabStripState(['home', 'issues', 'boards', 'mrs'], { storage }).close('issues');
    expect(make(storage).find('[aria-selected="true"]').exists()).toBe(true);
  });
  it('collapses a group without the active tab and keeps the active group open', async () => {
    const w = make();
    await w.find('[data-testid="tab-group-Code"]').trigger('click');
    expect(w.find('[data-testid="tab-group-Code"]').attributes('aria-expanded')).toBe('false');
    expect(w.findAll('[role="tab"]').length).toBe(3);
    await w.find('[data-testid="tab-group-Plan"]').trigger('click');
    expect(w.find('[data-testid="tab-group-Plan"]').attributes('aria-expanded')).toBe('true');
  });
  it('New tab catalog lists closed tabs and reopens one', async () => {
    const w = make();
    await w.find('[data-testid="close-tab-mrs"]').trigger('click');
    await w.find('[data-testid="tab-strip-new-tab"]').trigger('click');
    const cat = w.find('[data-testid="tab-strip-catalog"]');
    expect(cat.text()).toContain('closed');
    const btn = cat
      .findAll('button')
      .filter((b) => b.text().startsWith('Merge requests'))
      .at(0);
    await btn.trigger('click');
    expect(w.findAll('[role="tab"]').length).toBe(4);
    expect(w.emitted('reopen')[0][0].id).toBe('mrs');
  });
});
