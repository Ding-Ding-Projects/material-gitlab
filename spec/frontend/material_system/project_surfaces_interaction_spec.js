import { shallowMount } from '@vue/test-utils';
import Plan from '~/material_system/surfaces/Plan/Plan.vue';
import CicdTab from '~/material_system/surfaces/Settings/components/CicdTab.vue';
import Settings from '~/material_system/surfaces/Settings/Settings.vue';
import { SETTINGS_ADAPTER_METHODS } from '~/material_system/surfaces/Settings/adapter';

jest.mock('@gitlab/ui', () => ({ GlButton: { name: 'GlButton', template: '<button><slot /></button>' }, GlLink: { name: 'GlLink', template: '<a><slot /></a>' }, GlForm: { name: 'GlForm', template: '<form><slot /></form>' }, GlFormGroup: { name: 'GlFormGroup', template: '<div><slot /></div>' }, GlFormInput: { name: 'GlFormInput', template: '<input />' }, GlFormCheckbox: { name: 'GlFormCheckbox', template: '<input type="checkbox" />' } }));
jest.mock('~/material_system/notifications', () => ({ __esModule: true, default: { notify: jest.fn(), subscribe: () => () => {} } }));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const planProps = () => ({
  production: true, permissions: { milestones: true, wiki: true },
  fetchMilestones: jest.fn().mockResolvedValue([{ id: 1, name: 'Release', state: 'active' }]),
  fetchIterations: jest.fn().mockRejectedValue(new Error('Iterations unavailable')),
  fetchRequirements: jest.fn().mockRejectedValue(new Error('Requirements unavailable')),
  fetchWikiPages: jest.fn().mockResolvedValue([{ id: 'home', title: 'Home', body: 'Current', format: 'markdown' }]),
  saveWiki: jest.fn().mockRejectedValue(new Error('Save rejected')),
});

describe('project design surface interactions', () => {
  let wrapper;
  afterEach(() => wrapper?.destroy());

  it('renders available milestone records despite unavailable edition-specific resources', async () => {
    wrapper = shallowMount(Plan, { propsData: planProps() });
    await settle();
    expect(wrapper.findComponent({ name: 'RecordList' }).props('rows')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Plan data could not be loaded');
    wrapper.vm.selectTab('Iterations');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Iterations unavailable');
  });

  it('keeps the wiki edit buffer open after server rejection', async () => {
    const propsData = planProps();
    wrapper = shallowMount(Plan, { propsData });
    await settle();
    await wrapper.vm.toggleWikiEdit();
    wrapper.vm.updateWikiBody('Unsaved change');
    await wrapper.vm.toggleWikiEdit();
    expect(propsData.saveWiki).toHaveBeenCalledWith({ id: 'home', body: 'Unsaved change' });
    expect(wrapper.vm.wikiEditing).toBe(true);
    expect(wrapper.vm.activePage.body).toBe('Unsaved change');
    expect(wrapper.vm.wikiSaving).toBe(false);
  });

  it('does not offer iteration state mutation or unauthorized milestone mutation', async () => {
    wrapper = shallowMount(Plan, { propsData: { ...planProps(), permissions: { milestones: false, wiki: false } } });
    await settle();
    expect(wrapper.vm.bulkActions.map((action) => action.id)).toEqual(['export']);
    await wrapper.vm.toggleWikiEdit();
    expect(wrapper.vm.wikiEditing).toBe(false);
  });

  it('submits actual variable fields and clears the sensitive local draft', async () => {
    wrapper = shallowMount(CicdTab, { propsData: { variables: [], protectedBranches: [] } });
    await wrapper.setData({ variableFormOpen: true, newVariable: { key: 'BUILD_VALUE', value: 'user input', environment_scope: 'production', protected: true, masked: true } });
    wrapper.vm.submitVariable();
    expect(wrapper.emitted('add-variable')[0][0]).toEqual({ key: 'BUILD_VALUE', value: 'user input', environment_scope: 'production', protected: true, masked: true });
    expect(wrapper.vm.newVariable.value).toBe('');
    expect(wrapper.vm.variableFormOpen).toBe(false);
  });

  it('reloads partially accepted bulk changes before showing failure', async () => {
    const adapter = Object.fromEntries(SETTINGS_ADAPTER_METHODS.map((method) => [method, jest.fn()]));
    adapter.load.mockResolvedValueOnce({ projectName: 'Project', members: [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }] }).mockResolvedValueOnce({ projectName: 'Project', members: [{ id: 2, name: 'Two' }] });
    adapter.removeMembers.mockRejectedValue(new Error('Second member could not be removed'));
    wrapper = shallowMount(Settings, { propsData: { production: true, adapter, notifications: { notify: jest.fn() } } });
    await settle();
    await expect(wrapper.vm.runAdapter('removeMembers', [1, 2])).resolves.toBe(false);
    expect(adapter.load).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.members.map((member) => member.id)).toEqual([2]);
    expect(wrapper.vm.adapterError).toContain('Second member');
  });
});
