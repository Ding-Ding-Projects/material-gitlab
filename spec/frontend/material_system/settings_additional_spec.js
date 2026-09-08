jest.mock('@gitlab/ui', () => ({
  GlForm: { name: 'GlForm' }, GlButton: { name: 'GlButton' },
  GlFormCheckbox: { name: 'GlFormCheckbox' }, GlFormGroup: { name: 'GlFormGroup' },
  GlFormInput: { name: 'GlFormInput' }, GlFormTextarea: { name: 'GlFormTextarea' },
  GlInputGroup: { name: 'GlInputGroup' },
}));
jest.mock('~/lib/utils/csrf', () => ({ token: 'form-csrf' }));
import { mount } from '@vue/test-utils';
import AdditionalProjectSettings from '~/material_system/surfaces/Settings/components/AdditionalProjectSettings.vue';

jest.mock('~/material_system/surfaces/Settings/duo_remediation_adapter', () => ({ ensureDependencyBumpProfile: jest.fn() }));
import { ensureDependencyBumpProfile } from '~/material_system/surfaces/Settings/duo_remediation_adapter';

const metadata = () => ({
  duo: { allowed: true, action: '/group/project', fields: [{ key: 'duo_features_enabled', name: 'project[project_setting_attributes][duo_features_enabled]', label: 'GitLab Duo', value: true, locked: false }, { key: 'duo_remote_flows_enabled', name: 'project[project_setting_attributes][duo_remote_flows_enabled]', label: 'Allow flow execution', value: false, locked: true }] },
  default_work_item_template: { allowed: true, action: '/group/project', value: '## Default' },
  external_authorization: { allowed: true, action: '/group/project', value: 'restricted', default_label: 'default' },
  repository_size_limit: { allowed: true, action: '/group/project', value: 256 },
});
const stubs = { 'gl-form': { template: '<form><slot /></form>' }, 'gl-button': { template: '<button><slot /></button>' }, 'gl-form-checkbox': { props: ['value', 'disabled', 'name'], template: '<label><input type="checkbox" :name="name" :checked="value" :disabled="disabled" /><slot /></label>' }, 'gl-form-group': { template: '<div><slot /></div>' }, 'gl-form-input': { props: ['value', 'name'], template: '<input :name="name" :value="value" />' }, 'gl-form-textarea': { props: ['value', 'name'], template: '<textarea :name="name" :value="value" />' } };
const wrappers = [];
const factory = (propsData = { metadata: metadata() }) => { const wrapper = mount(AdditionalProjectSettings, { propsData, stubs }); wrappers.push(wrapper); return wrapper; };
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.destroy()); });

describe('Material Settings additional project controls', () => {
  it('mounts native PATCH forms with scoped project field names and CSRF inputs', () => {
    const wrapper = factory();
    expect(wrapper.findAll('form')).toHaveLength(4);
    expect(wrapper.findAll('input[name="_method"][value="patch"]')).toHaveLength(4);
    expect(wrapper.findAll('input[name="authenticity_token"]')).toHaveLength(4);
    expect(wrapper.find('textarea').element.value).toBe('## Default');
    expect(wrapper.find('input[name="project[external_authorization_classification_label]"]').element.value).toBe('restricted');
    expect(wrapper.find('input[name="project[repository_size_limit]"]').element.value).toBe('256');
  });

  it('preserves a locked Duo field without submitting a false hidden value', () => {
    const wrapper = factory();
    const inputs = wrapper.findAll('input');
    const unlocked = inputs.wrappers.filter((input) => input.attributes('name') === 'project[project_setting_attributes][duo_features_enabled]');
    const locked = inputs.wrappers.filter((input) => input.attributes('name') === 'project[project_setting_attributes][duo_remote_flows_enabled]');
    expect(unlocked).toHaveLength(2);
    expect(locked).toHaveLength(1);
    expect(locked[0].attributes('disabled')).toBe('disabled');
  });

  it('does not render controls for revoked or malformed action metadata', async () => {
    const data = metadata();
    data.default_work_item_template = { allowed: false, action: '/group/project', value: 'hidden' };
    data.external_authorization.action = '//elsewhere.invalid/project';
    const wrapper = factory({ metadata: data });
    expect(wrapper.find('[data-testid="material-default-template-settings"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="material-external-authorization-settings"]').exists()).toBe(false);
    await wrapper.setProps({ metadata: { ...data, duo: { allowed: false, action: '/group/project', fields: [] } } });
    expect(wrapper.find('[data-testid="material-duo-settings"]').exists()).toBe(false);
  });

  it('does not submit a dependent Duo value while its prerequisite is disabled', async () => {
    const data = metadata();
    data.duo.fields[0].value = false;
    data.duo.fields[1] = { key: 'duo_sast_vr_workflow_enabled', name: 'project[project_setting_attributes][duo_sast_vr_workflow_enabled]', label: 'SAST workflow', value: true, locked: false };
    const wrapper = factory({ metadata: data });
    const workflowInputs = wrapper.findAll('input').wrappers.filter((input) => input.attributes('name') === 'project[project_setting_attributes][duo_sast_vr_workflow_enabled]');
    expect(workflowInputs).toHaveLength(1);
    expect(workflowInputs[0].attributes('disabled')).toBe('disabled');
  });

  it('enables dependency bump resolution only after the required remediation profile attaches', async () => {
    ensureDependencyBumpProfile.mockResolvedValueOnce({ attached: true });
    const data = metadata();
    data.duo.fields.push({ key: 'duo_dependency_bump_breaking_changes_enabled', name: 'project[project_setting_attributes][duo_dependency_bump_breaking_changes_enabled]', label: 'Dependency bump resolution', value: false, locked: false, requires_remediation_profile: true, project_full_path: 'group/project', project_global_id: 'gid://gitlab/Project/7' });
    const wrapper = factory({ metadata: data });
    const field = wrapper.vm.duoFields.find((entry) => entry.requires_remediation_profile);
    wrapper.vm.openRemediation(field);
    await wrapper.vm.attachRemediationProfile();
    expect(ensureDependencyBumpProfile).toHaveBeenCalledWith({ projectFullPath: 'group/project', projectGlobalId: 'gid://gitlab/Project/7', allowed: true });
    expect(field.value).toBe(true);
    expect(wrapper.vm.remediationField).toBeNull();
  });
});
