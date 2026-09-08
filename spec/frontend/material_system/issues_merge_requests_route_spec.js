import { shallowMount } from '@vue/test-utils';
import waitForPromises from 'helpers/wait_for_promises';
import { initIssues } from '~/material_system/surfaces/Issues';
import Issues from '~/material_system/surfaces/Issues/Issues.vue';
import { createGitLabIssuesAdapter } from '~/material_system/surfaces/Issues/data';
import { initMergeRequests } from '~/material_system/surfaces/MergeRequests';
import MergeRequests from '~/material_system/surfaces/MergeRequests/MergeRequests.vue';
import { createProjectMergeRequestsAdapter } from '~/material_system/surfaces/MergeRequests/data';
import notifications from '~/material_system/notifications';

jest.mock('~/api', () => ({ buildUrl: (value) => value.replace(':version', 'v4') }));
jest.mock('~/lib/utils/axios_utils', () => ({}));
jest.mock('@gitlab/ui', () => ({ GlButton: { name: 'GlButton', props: ['href'], render(h) { return h('a', { attrs: { href: this.href } }, this.$slots.default); } }, GlLink: { name: 'GlLink', props: ['href'], render(h) { return h('a', { attrs: { href: this.href } }, this.$slots.default); } } }));
jest.mock('~/material_system/notifications', () => ({ __esModule: true, default: { notify: jest.fn(), subscribe: () => () => {} } }));

const rawIssue = { id: 400, iid: 3, title: 'Release issue', state: 'opened', web_url: '/team/project/-/issues/3' };
const rawMr = { id: 700, iid: 5, title: 'Review changes', state: 'opened', source_branch: 'change', target_branch: 'main', web_url: '/team/project/-/merge_requests/5', author: { id: 2, name: 'Reviewer' } };
const issuePage = (issues = []) => ({ issues, pagination: { page: 1, totalPages: 1, hasNextPage: false } });
const mrPage = (items = []) => ({ items, page: 1, totalPages: 1, hasNextPage: false });

describe('Issues and Merge Requests production routes', () => {
  let wrapper;
  let vm;
  let previousGon;
  beforeEach(() => { previousGon = global.gon; global.gon = { relative_url_root: '', api_version: 'v4' }; });
  afterEach(() => { wrapper?.destroy(); vm?.$destroy(); wrapper = null; vm = null; global.gon = previousGon; jest.clearAllMocks(); });

  it('binds the explicit project identity, user and permissions to the real Issues mount', async () => {
    const el = document.createElement('div');
    Object.assign(el.dataset, { projectId: '42', canCreate: 'true', canUpdate: 'false', canDelete: 'false', currentUser: JSON.stringify({ id: 8, name: 'Current user' }), newIssuePath: '/team/project/-/issues/new', boardPath: '/team/project/-/boards' });
    const adapter = { listPage: jest.fn().mockResolvedValue(issuePage()) };
    vm = initIssues(el, { adapter });
    await waitForPromises();
    expect(vm.$children[0].$props).toMatchObject({ projectId: '42', production: true, user: { id: 8 }, permissions: { create: true, update: false, delete: false } });
    expect(adapter.listPage).toHaveBeenCalledWith(expect.objectContaining({ state: 'opened', scope: 'all' }));
    expect(vm.$el.getAttribute('data-material-topbar-owner')).toBe('surface.issues');
  });

  it('rejects a missing route identity instead of using a previous project global', () => {
    global.gon.current_project_id = 99;
    expect(() => initIssues(document.createElement('div'))).toThrow('data-project-id');
    expect(() => initMergeRequests(document.createElement('div'))).toThrow('data-project-path');
  });

  it('maps the MR route identity, authorized creation path and live list adapter', async () => {
    const el = document.createElement('div');
    Object.assign(el.dataset, { projectPath: 'team/project', canCreate: 'true', canUpdate: 'false', currentUser: JSON.stringify({ id: 8, name: 'Current user' }), newMergeRequestPath: '/team/project/-/merge_requests/new' });
    const adapter = { listPage: jest.fn().mockResolvedValue(mrPage()) };
    vm = initMergeRequests(el, { adapter });
    await waitForPromises();
    expect(vm.$children[0].$props).toMatchObject({ projectPath: 'team/project', production: true, currentUser: { id: 8 }, newMergeRequestPath: '/team/project/-/merge_requests/new' });
    expect(adapter.listPage).toHaveBeenCalledWith(expect.objectContaining({ state: 'opened', mine: false }));
    expect(vm.$el.getAttribute('data-material-topbar-owner')).toBe('surface.merge-requests');
  });

  it('shows list authorization errors instead of an empty MR success', async () => {
    wrapper = shallowMount(MergeRequests, { propsData: { projectPath: 'team/project', production: true, listAdapter: { listPage: jest.fn().mockRejectedValue(new Error('Forbidden')) } } });
    await waitForPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('Forbidden');
    expect(wrapper.findComponent({ name: 'MrList' }).exists()).toBe(false);
  });

  it('opens the actual review route instead of a partial inline detail implementation', async () => {
    const navigate = jest.fn();
    const item = { ...rawMr, state: 'Open', webUrl: rawMr.web_url, author: 'Reviewer', threads: [] };
    wrapper = shallowMount(MergeRequests, { propsData: { projectPath: 'team/project', production: true, navigate, listAdapter: { listPage: jest.fn().mockResolvedValue(mrPage([item])) } } });
    await waitForPromises();
    await wrapper.vm.openDetail(item.id);
    expect(navigate).toHaveBeenCalledWith(rawMr.web_url);
    expect(wrapper.vm.currentDetail).toBeNull();
  });

  it('retains server-confirmed partial bulk close results and never announces all closed', async () => {
    const one = { id: 1, iid: 1, state: 'Open', title: 'One', author: '', branch: '', threads: [] };
    const two = { ...one, id: 2, iid: 2, title: 'Two' };
    const adapter = { listPage: jest.fn().mockResolvedValue(mrPage([one, two])), close: jest.fn().mockResolvedValueOnce({ ...one, state: 'Closed' }).mockRejectedValueOnce(new Error('Second denied')) };
    wrapper = shallowMount(MergeRequests, { propsData: { projectPath: 'team/project', production: true, permissions: { update: true }, listAdapter: adapter } });
    await waitForPromises();
    await wrapper.setData({ selectedIds: [1, 2] });
    await wrapper.vm.closeSelectedMrs();
    expect(wrapper.vm.mrs.map((item) => item.state)).toEqual(['Closed', 'Open']);
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ message: '1 merge requests closed.', severity: 'success' }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Second denied', severity: 'error' }));
  });

  it('does not announce a failed issue state change as success', async () => {
    const issue = { ...rawIssue, state: 'Open', labels: [], assignees: [] };
    wrapper = shallowMount(Issues, { propsData: { projectId: 42, apiAdapter: { listPage: jest.fn().mockResolvedValue(issuePage([issue])), update: jest.fn().mockRejectedValue(new Error('Rejected')) } } });
    await waitForPromises();
    wrapper.vm.openDrawer(issue.id);
    await wrapper.vm.toggleDrawerState();
    expect(notifications.notify).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    expect(wrapper.vm.issues[0].state).toBe('Open');
  });

  it.each([undefined, null, false, 'true', 1])('rejects all issue writes with malformed permission %p', async (value) => {
    const http = { post: jest.fn(), put: jest.fn(), delete: jest.fn() };
    const adapter = createGitLabIssuesAdapter({ projectId: 42, http, permissions: { create: value, update: value, delete: value } });
    await expect(adapter.create({ title: 'New' })).rejects.toThrow('current project access');
    await expect(adapter.update(3, { state: 'Closed' })).rejects.toThrow('current project access');
    await expect(adapter.remove([3])).rejects.toThrow('current project access');
    expect(http.post).not.toHaveBeenCalled();
    expect(http.put).not.toHaveBeenCalled();
    expect(http.delete).not.toHaveBeenCalled();
  });

  it('uses the installation prefix and server pagination for MR list requests', async () => {
    global.gon.relative_url_root = '/gitlab';
    const http = { get: jest.fn().mockResolvedValue({ data: [rawMr], headers: { 'x-page': '2', 'x-next-page': '3' } }) };
    const adapter = createProjectMergeRequestsAdapter({ projectPath: 'team/project', http });
    const result = await adapter.listPage({ page: 2, mine: true, search: 'Review' });
    expect(http.get).toHaveBeenCalledWith('/gitlab/api/v4/projects/team%2Fproject/merge_requests', { params: { page: 2, per_page: 20, state: 'opened', scope: 'created_by_me', search: 'Review' } });
    expect(result).toMatchObject({ page: 2, totalPages: null, hasNextPage: true, items: [{ pipeline: 'unknown', approvals: 'Unavailable', discussionCount: null }] });
  });

  it('rejects a successful HTTP response that did not close the MR', async () => {
    const http = { put: jest.fn().mockResolvedValue({ data: rawMr }) };
    const adapter = createProjectMergeRequestsAdapter({ projectPath: 'team/project', permissions: { update: true }, http });
    await expect(adapter.close(5)).rejects.toThrow('did not confirm');
    expect(http.put).toHaveBeenCalledWith('/api/v4/projects/team%2Fproject/merge_requests/5', { state_event: 'close' });
  });

  it.each([undefined, null, false, 'true', 1])('rejects MR close with permission %p before transport', async (update) => {
    const http = { put: jest.fn() };
    const adapter = createProjectMergeRequestsAdapter({ projectPath: 'team/project', permissions: { update }, http });
    await expect(adapter.close(5)).rejects.toThrow('current project access');
    expect(http.put).not.toHaveBeenCalled();
  });

  it('rejects malformed successful list payloads for both adapters', async () => {
    const http = { get: jest.fn().mockResolvedValue({ data: { message: 'Not a list' } }) };
    await expect(createGitLabIssuesAdapter({ projectId: 42, http }).listPage()).rejects.toThrow('invalid issues list');
    await expect(createProjectMergeRequestsAdapter({ projectPath: 'team/project', http }).listPage()).rejects.toThrow('invalid merge requests list');
  });
});
jest.mock('~/material_system/surfaces/MergeRequests/mergerequests.scss', () => ({}));
