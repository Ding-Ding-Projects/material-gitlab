jest.mock('@gitlab/ui', () => ({
  GlForm: { name: 'GlForm' }, GlButton: { name: 'GlButton' },
  GlFormCheckbox: { name: 'GlFormCheckbox' }, GlFormGroup: { name: 'GlFormGroup' },
  GlFormInput: { name: 'GlFormInput' }, GlFormTextarea: { name: 'GlFormTextarea' },
  GlInputGroup: { name: 'GlInputGroup' },
}));
jest.mock('~/lib/utils/csrf', () => ({ token: 'form-csrf' }));
import { mount } from '@vue/test-utils';
import AdvancedSettings from '~/material_system/surfaces/Settings/components/AdvancedSettings.vue';

jest.mock('~/material_system/surfaces/Settings/advanced_destinations', () => ({
  loadTransferDestinations: jest.fn().mockResolvedValue({
    users: [{ id: '10', humanName: 'Personal namespace', fullPath: 'personal' }],
    groups: [{ id: '11', humanName: 'Managed group', fullPath: 'managed' }],
    totalPages: 2,
  }),
}));

const metadata = () => ({
  housekeeping: { allowed: true, action: '/group/project/housekeeping' },
  export: { allowed: true, status: 'finished', export_action: '/group/project/export', download_action: '/group/project/download_export', generate_action: '/group/project/generate_new_export' },
  path_change: { allowed: true, action: '/group/project', prefix: 'http://gitlab.test/group', current_path: 'project' },
  transfer: { allowed: true, action: '/group/project/transfer', project_id: 7, confirm_phrase: 'group/project' },
  archive: { allowed: true, action: '/group/project/archive', marked_for_deletion: false },
  unarchive: { allowed: true, action: '/group/project/unarchive' },
  remove_fork: { allowed: true, action: '/group/project/remove_fork', confirm_phrase: 'project' },
  restore: { allowed: true, action: '/group/project/restore' },
  delete: { allowed: true, mode: 'delayed', form_path: '/group/project', confirm_phrase: 'group/project', button_text: 'Delete', issues_count: 2, merge_requests_count: 3, forks_count: 4, stars_count: 5 },
});

const stubs = {
  'gl-form': { template: '<form v-on="$listeners"><slot /></form>' },
  'gl-button': { props: ['disabled'], template: '<button :disabled="disabled" v-on="$listeners"><slot /></button>' },
  'gl-form-checkbox': { props: ['value'], template: '<label><input type="checkbox" :checked="value" @change="$emit(\'input\', $event.target.checked)" /><slot /></label>' },
  'gl-form-group': { template: '<div><slot /></div>' },
  'gl-form-input': { props: ['value'], template: '<input :value="value" v-on="$listeners" />' },
  'gl-input-group': { template: '<div><slot /></div>' },
  ConfirmDialog: { props: ['title', 'description', 'confirmLabel'], template: '<div data-testid="confirm-dialog"><button data-testid="confirm" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>' },
};

const wrappers = [];
const factory = (propsData = { metadata: metadata() }) => { const wrapper = mount(AdvancedSettings, { propsData, stubs }); wrappers.push(wrapper); return wrapper; };
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.destroy()); });

describe('Material Settings advanced controls', () => {
  it('renders real native forms with server action paths, methods, CSRF, and controller payloads', () => {
    const wrapper = factory();
    const forms = wrapper.findAll('form');

    expect(forms.at(0).attributes('action')).toBe('/group/project/housekeeping');
    expect(forms.at(0).attributes('method')).toBe('post');
    expect(wrapper.find('input[name="authenticity_token"]').exists()).toBe(true);
    expect(wrapper.find('input[name="prune"]').attributes('value')).toBe('true');
    expect(wrapper.find('input[name="_method"][value="patch"]').exists()).toBe(true);
    expect(wrapper.find('input[name="project[path]"]').exists()).toBe(true);
    expect(wrapper.find('input[name="_method"][value="put"]').exists()).toBe(true);
    expect(wrapper.find('input[name="new_namespace_id"]').exists()).toBe(true);
    expect(wrapper.find('input[name="_method"][value="delete"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="material-export-card"]').text()).toContain('Download export');
    expect(wrapper.find('[data-testid="material-export-card"]').text()).toContain('Generate new export');
  });

  it('requires pruning acknowledgement and rechecks it before native submission', async () => {
    const wrapper = factory();
    const submit = jest.fn();
    wrapper.vm.$refs.pruneForm = { submit };

    wrapper.vm.requestPrune();
    expect(wrapper.vm.pendingAction).toBeNull();

    wrapper.setData({ pruneAcknowledged: true });
    await wrapper.vm.$nextTick();
    wrapper.vm.requestPrune();
    expect(wrapper.vm.pendingAction.key).toBe('prune');

    wrapper.setData({ pruneAcknowledged: false });
    await wrapper.vm.$nextTick();
    wrapper.vm.submitPendingAction();
    expect(submit).not.toHaveBeenCalled();
  });

  it('blocks a confirmation whose permission is revoked after opening', async () => {
    const data = metadata();
    const wrapper = factory({ metadata: data });
    const submit = jest.fn();
    wrapper.vm.$refs.archiveForm = { submit };

    wrapper.vm.requestArchive();
    expect(wrapper.vm.pendingAction.key).toBe('archive');
    await wrapper.setProps({ metadata: { ...data, archive: { allowed: false, action: '/group/project/archive', marked_for_deletion: false } } });
    wrapper.vm.submitPendingAction();
    expect(submit).not.toHaveBeenCalled();
  });

  it('refuses malformed action metadata and does not render a submit form for it', () => {
    const data = metadata();
    data.housekeeping.action = '//elsewhere.invalid/housekeeping';
    data.archive.action = '/\\elsewhere.invalid/archive';
    const wrapper = factory({ metadata: data });

    expect(wrapper.find('[data-testid="material-housekeeping-card"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="material-archive-card"]').exists()).toBe(false);
    expect(wrapper.vm.actionFor('housekeeping')).toBe('');
    expect(wrapper.vm.actionFor('archive')).toBe('');
  });

  it('requires exact typed confirmation before transfer, fork removal, and deletion submit', async () => {
    const wrapper = factory();
    const transferSubmit = jest.fn();
    const forkSubmit = jest.fn();
    const deleteSubmit = jest.fn();
    wrapper.vm.$refs.transferForm = { submit: transferSubmit };
    wrapper.vm.$refs.removeForkForm = { submit: forkSubmit };
    wrapper.vm.$refs.deleteForm = { submit: deleteSubmit };

    wrapper.setData({ transferNamespaceId: '11', transferConfirmation: 'wrong', removeForkConfirmation: 'wrong', deleteConfirmation: 'wrong' });
    await wrapper.vm.$nextTick();
    wrapper.vm.requestTransfer();
    wrapper.vm.requestRemoveFork();
    wrapper.vm.requestDelete();
    expect(wrapper.vm.pendingAction).toBeNull();

    wrapper.setData({ transferConfirmation: 'group/project', removeForkConfirmation: 'project', deleteConfirmation: 'group/project' });
    await wrapper.vm.$nextTick();
    wrapper.vm.requestTransfer();
    wrapper.vm.submitPendingAction();
    wrapper.vm.requestRemoveFork();
    wrapper.vm.submitPendingAction();
    wrapper.vm.requestDelete();
    wrapper.vm.submitPendingAction();

    expect(transferSubmit).toHaveBeenCalledTimes(1);
    expect(forkSubmit).toHaveBeenCalledTimes(1);
    expect(deleteSubmit).toHaveBeenCalledTimes(1);
  });

  it('loads permitted destination namespaces and submits only the selected namespace ID', async () => {
    const wrapper = factory();
    await wrapper.vm.$nextTick();
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    const option = wrapper.find('.st-destination');
    expect(option.exists()).toBe(true);
    await option.trigger('click');
    expect(wrapper.vm.transferNamespaceId).toBe('10');
    expect(wrapper.find('input[name="new_namespace_id"]').element.value).toBe('10');
  });
});
