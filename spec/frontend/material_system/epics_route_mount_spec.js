import waitForPromises from 'helpers/wait_for_promises';
import { mountEpics } from '~/material_system/surfaces/Epics';

jest.mock('~/locale', () => ({
  __: (value) => value,
  n__: (single, multiple, count) => count === 1 ? single : multiple,
  sprintf: (value, replacements) => value.replace(/%\{([^}]+)\}/g, (_match, name) => replacements[name]),
}));
jest.mock('~/material_system/notifications', () => ({ __esModule: true, default: { notify: jest.fn(), subscribe: () => () => {} } }));

describe('production Epics component mount', () => {
  let vm;
  afterEach(() => vm?.$destroy());

  it('renders a live server record and keeps native navigation plus the topbar owner after mounting', async () => {
    const el = document.createElement('div');
    el.dataset.materialEpics = 'true';
    el.dataset.materialEpicsConfig = JSON.stringify({ fullPath: 'team', graphqlEndpoint: '/api/graphql', permissions: { update: false, delete: false } });
    const fetchEpicsData = jest.fn().mockResolvedValue([{ id: 'gid://gitlab/Epic/1', iid: 1, reference: '&1', title: 'Current planning work', state: 'opened', startDate: '2027-09-10', dueDate: '2028-01-01', webUrl: '/groups/team/-/epics/1', descendantCounts: { openedIssues: 2, closedIssues: 1 }, children: [] }]);
    vm = mountEpics(el, { fetchEpicsData, currentUser: { name: 'Current user', initials: 'CU' }, permissions: { update: false, delete: false }, createPath: '/groups/team/-/epics/new', roadmapPath: '/groups/team/-/roadmap' });
    await waitForPromises();
    expect(vm.$el.getAttribute('data-material-topbar-owner')).toBe('surface.epics');
    expect(vm.$el.textContent).toContain('Current planning work');
    expect(vm.$el.textContent).toContain('2027-09-10 → 2028-01-01');
    expect(vm.$el.querySelector('a[href="/groups/team/-/roadmap"]')).not.toBeNull();
    expect(vm.$el.querySelector('a[href="/groups/team/-/epics/new"]')).not.toBeNull();
    expect(vm.$el.querySelector('a[href="/groups/team/-/epics/1"]')).not.toBeNull();
    expect(vm.$el.textContent).not.toContain('ULTIMATE');
    vm.$children[0].setView('roadmap');
    expect(vm.$children[0].view).toBe('tree');
  });
});
jest.mock('~/material_system/surfaces/Epics/epics.scss', () => ({}));
