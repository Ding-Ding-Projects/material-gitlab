import { shallowMount, mount } from '@vue/test-utils';
import waitForPromises from 'helpers/wait_for_promises';
import { createProjectSettingsAdapter } from '~/material_system/surfaces/Settings/project_adapter';
import DescriptionTopicsCard from '~/material_system/surfaces/Settings/components/DescriptionTopicsCard.vue';
import ProjectLogoCard from '~/material_system/surfaces/Settings/components/ProjectLogoCard.vue';
import ProjectDetailsCard from '~/material_system/surfaces/Settings/components/ProjectDetailsCard.vue';
import ConfirmDialog from '~/material_system/surfaces/Settings/components/ConfirmDialog.vue';
import BadgesCard from '~/material_system/surfaces/Settings/components/BadgesCard.vue';

jest.mock('~/lib/utils/csrf', () => ({ token: 'form-csrf' }));
jest.mock('@gitlab/ui', () => ({
  GlButton: { name: 'GlButton', render(h) { return h('button', { attrs: this.$attrs, on: this.$listeners }, this.$slots.default); } },
  GlForm: { name: 'GlForm', render(h) { return h('form', { attrs: this.$attrs, on: this.$listeners }, this.$slots.default); } },
  GlFormGroup: { name: 'GlFormGroup', render(h) { return h('div', this.$slots.default); } },
  GlFormInput: { name: 'GlFormInput', render(h) { return h('input', { attrs: this.$attrs }); } },
  GlFormTextarea: { name: 'GlFormTextarea', render(h) { return h('textarea', { attrs: this.$attrs }); } },
}));

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) });
const project = { id: 'gid://gitlab/Project/7', name: 'Current project', description: 'Saved description', topics: ['build', 'delivery'], visibility: 'private' };
const badge = { id: 11, kind: 'project', name: 'Build', image_url: 'https://example.test/image.svg', link_url: 'https://example.test/status' };

describe('design-owned general Settings capabilities', () => {
  let wrapper;
  afterEach(() => { wrapper?.destroy(); wrapper = null; jest.restoreAllMocks(); });

  it('submits user description and distinct comma-separated topic names', async () => {
    wrapper = shallowMount(DescriptionTopicsCard, { propsData: { description: 'Old', topics: ['old'] } });
    await wrapper.setData({ draftDescription: 'New description', draftTopics: ' build, delivery, build, ' });
    wrapper.vm.save();
    expect(wrapper.emitted('save')[0][0]).toEqual({ description: 'New description', topics: ['build', 'delivery'] });
  });

  it('persists description and topics through the existing Rails project field schema', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ name: project.name })).mockResolvedValueOnce(response({ data: { project } }));
    const adapter = createProjectSettingsAdapter({ projectId: 7, fullPath: 'group/project', projectEndpoint: '/group/project.json', permissions: { project: true }, fetchImpl });
    await expect(adapter.updateProject({ description: 'Saved description', topics: ['build', 'delivery'] })).resolves.toMatchObject({ description: 'Saved description', topics: ['build', 'delivery'] });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ project: { description: 'Saved description', topics: 'build, delivery' } });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).query).toContain('description topics');
  });

  it('requires a distinct visibility ability and the allowed server level', async () => {
    const fetchImpl = jest.fn();
    let adapter = createProjectSettingsAdapter({ projectId: 7, fullPath: 'group/project', permissions: { project: true }, allowedVisibilityLevels: [0, 20], fetchImpl });
    await expect(adapter.updateProject({ visibility: 'Public' })).rejects.toThrow('current project access');
    adapter = createProjectSettingsAdapter({ projectId: 7, fullPath: 'group/project', permissions: { project: true, visibility: true }, allowedVisibilityLevels: [0], fetchImpl });
    await expect(adapter.updateProject({ visibility: 'Public' })).rejects.toThrow('current project rules');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('disables visibility levels excluded by server metadata', () => {
    wrapper = shallowMount(ProjectDetailsCard, { propsData: { projectName: 'Project', visibility: 'Private', allowedVisibilityLevels: [0] } });
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.at(0).attributes('disabled')).toBeUndefined();
    expect(radios.at(1).attributes('disabled')).toBeDefined();
    expect(radios.at(2).attributes('disabled')).toBeDefined();
  });

  it('requires the exact project phrase before emitting a destructive confirmation', async () => {
    wrapper = mount(ConfirmDialog, { propsData: { title: 'Change visibility', confirmationPhrase: 'group/project' } });
    wrapper.vm.confirm();
    expect(wrapper.emitted('confirm')).toBeUndefined();
    const phraseField = wrapper.find('md-filled-text-field');
    phraseField.element.value = 'group/project';
    await phraseField.trigger('input');
    wrapper.vm.confirm();
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('uses native CSRF-protected avatar deletion only after confirmation', async () => {
    const submit = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    wrapper = mount(ProjectLogoCard, { propsData: { logoColor: '#6750c4', logoLetter: 'P', logoUrl: '/avatar.png', production: true, avatarRemoval: { allowed: true, action: '/group/project/-/avatar' } } });
    expect(wrapper.find('form').attributes('method')).toBe('post');
    expect(wrapper.find('input[name="_method"]').element.value).toBe('delete');
    expect(wrapper.find('input[name="authenticity_token"]').element.value).toBe('form-csrf');
    wrapper.vm.removeAvatar();
    expect(submit).not.toHaveBeenCalled();
    await wrapper.find('form').trigger('submit');
    wrapper.vm.removeAvatar();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('rechecks avatar permission at final confirmation', async () => {
    const submit = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    wrapper = mount(ProjectLogoCard, { propsData: { logoColor: '#6750c4', logoLetter: 'P', logoUrl: '/avatar.png', production: true, avatarRemoval: { allowed: true, action: '/group/project/-/avatar' } } });
    await wrapper.find('form').trigger('submit');
    await wrapper.setProps({ avatarRemoval: { allowed: false, action: '/group/project/-/avatar' } });
    wrapper.vm.removeAvatar();
    expect(submit).not.toHaveBeenCalled();
  });

  it('loads inherited badges but mutates only the selected project badge endpoint', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response([badge, { ...badge, id: 12, kind: 'group' }])).mockResolvedValueOnce(response(badge)).mockResolvedValueOnce(response([badge]));
    const adapter = createProjectSettingsAdapter({ projectId: 7, fullPath: 'group/project', permissions: { badges: true }, fetchImpl });
    await expect(adapter.loadBadges()).resolves.toMatchObject([{ inherited: false }, { inherited: true }]);
    await adapter.saveBadge({ id: 11, name: 'Build', imageUrl: badge.image_url, linkUrl: badge.link_url });
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/v4/projects/7/badges/11');
    expect(fetchImpl.mock.calls[1][1].method).toBe('PUT');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ name: 'Build', image_url: badge.image_url, link_url: badge.link_url });
  });

  it('rejects unsafe badge URLs before transport', async () => {
    const fetchImpl = jest.fn();
    const adapter = createProjectSettingsAdapter({ projectId: 7, fullPath: 'group/project', permissions: { badges: true }, fetchImpl });
    await expect(adapter.saveBadge({ name: 'Bad', imageUrl: 'javascript:alert(1)', linkUrl: 'https://example.test' })).rejects.toThrow('HTTP or HTTPS');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('retains rejected badge drafts and never loads preview images automatically', async () => {
    const adapter = { loadBadges: jest.fn().mockResolvedValue([]), saveBadge: jest.fn().mockRejectedValue(new Error('Rejected')) };
    wrapper = shallowMount(BadgesCard, { propsData: { adapter } });
    await waitForPromises();
    await wrapper.setData({ draft: { name: 'Build', imageUrl: badge.image_url, linkUrl: badge.link_url } });
    await wrapper.vm.save();
    expect(wrapper.vm.draft.name).toBe('Build');
    expect(wrapper.text()).toContain('Rejected');
    expect(wrapper.find('img').exists()).toBe(false);
  });
});
