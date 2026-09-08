import waitForPromises from 'helpers/wait_for_promises';
import { mountProjectSettings } from '~/material_system/surfaces/Settings';
import { SETTINGS_ADAPTER_METHODS } from '~/material_system/surfaces/Settings/adapter';
import { assertSettingsRouteConfig, SETTINGS_ROUTE_METADATA_FIELDS } from '~/material_system/surfaces/Settings/route_contract';

jest.mock('~/material_system/surfaces/Settings/advanced_destinations', () => ({ loadTransferDestinations: jest.fn().mockResolvedValue({ users: [], groups: [], totalPages: 1 }) }));
jest.mock('~/material_system/surfaces/Settings/duo_remediation_adapter', () => ({ ensureDependencyBumpProfile: jest.fn() }));
jest.mock('~/lib/utils/csrf', () => ({ token: 'mount-csrf' }));
jest.mock('~/material_system/notifications', () => ({ __esModule: true, default: { notify: jest.fn(), subscribe: () => () => {} } }));
jest.mock('~/material_system/surfaces/Settings/service_desk_adapter', () => ({ ...jest.requireActual('~/material_system/surfaces/Settings/service_desk_adapter'), createServiceDeskAdapter: () => ({ load: jest.fn().mockResolvedValue({ enabled: false }), save: jest.fn() }) }));
jest.mock('~/material_system/surfaces/Settings/secrets_manager_settings_adapter', () => ({ createSecretsManagerSettingsAdapter: () => ({ load: jest.fn().mockResolvedValue({ status: 'ACTIVE', healthy: true, permissions: [] }) }) }));
jest.mock('~/material_system/surfaces/Settings/special_capabilities_adapter', () => ({ createSpecialCapabilitiesAdapter: () => ({ loadCatalog: jest.fn().mockResolvedValue({ enabled: false, description: 'Project description' }) }) }));
jest.mock('@gitlab/ui', () => {
  const control = (name, tag) => ({ name, render(h) { return h(tag, { attrs: this.$attrs, on: this.$listeners }, this.$slots.default); } });
  return {
    GlButton: control('GlButton', 'button'), GlLink: control('GlLink', 'a'),
    GlForm: control('GlForm', 'form'), GlFormGroup: control('GlFormGroup', 'div'),
    GlFormInput: control('GlFormInput', 'input'), GlFormTextarea: control('GlFormTextarea', 'textarea'),
    GlFormCheckbox: control('GlFormCheckbox', 'input'), GlFormSelect: control('GlFormSelect', 'select'),
    GlInputGroup: control('GlInputGroup', 'div'), GlAlert: control('GlAlert', 'div'),
  };
});

const config = () => ({
  projectId: 7, fullPath: 'group/project', projectEndpoint: '/group/project.json',
  generalAllowed: true, userName: 'Current user', userInitials: 'CU',
  permissions: { project: true, visibility: true, badges: true },
  allowedVisibilityLevels: [0, 10, 20], visibilityConfirmationPhrase: 'group/project',
  avatarRemoval: { allowed: true, action: '/group/project/-/avatar' },
  permissionsMetadata: { allowed: true, action: '/group/project', fields: [{ key: 'wikiAccessLevel', name: 'project[project_feature_attributes][wiki_access_level]', value: 10, label: 'Wiki', kind: 'access' }] },
  additionalMetadata: { default_work_item_template: { allowed: true, action: '/group/project', value: 'Template' }, external_authorization: { allowed: true, action: '/group/project', value: 'classification' } },
  advancedMetadata: { housekeeping: { allowed: true, action: '/group/project/housekeeping' }, transfer: { allowed: true, action: '/group/project/transfer', project_id: 7, confirm_phrase: 'group/project' }, delete: { allowed: true, mode: 'delayed', form_path: '/group/project', confirm_phrase: 'group/project', button_text: 'Delete' } },
  serviceDeskMetadata: { supported: true, allowed: true, endpoint: '/group/project/service_desk', customEmailEndpoint: '/group/project/custom_email', issueTrackerEnabled: true, templates: [] },
  specialMetadata: { ci_catalog: { available: true, full_path: 'group/project' }, bot_access: { available: true, allowed: true, action: '/group/project', enabled: false } },
  secretsMetadata: { available: true, allowed: true, full_path: 'group/project', graphql_endpoint: '/api/graphql' },
  duoContextMetadata: { allowed: true, action: '/group/project', exclusion_rules: ['private/**'] },
});

describe('complete design-owned Settings host', () => {
  let vm;
  afterEach(() => vm?.$destroy());
  const start = (metadata) => {
    const el = document.createElement('div');
    el.dataset.materialProjectSettings = JSON.stringify(metadata);
    const adapter = Object.fromEntries(SETTINGS_ADAPTER_METHODS.map((method) => [method, jest.fn()]));
    adapter.load.mockResolvedValue({ projectName: 'Project', visibility: 'Private', logoUrl: '/avatar.png', description: 'Description', topics: ['topic'], permissions: { visibility: true }, members: [], variables: [], protectedBranches: [], integrations: [] });
    adapter.loadBadges = jest.fn().mockResolvedValue([]);
    vm = mountProjectSettings(el, { adapter });
    return adapter;
  };

  it.each(SETTINGS_ROUTE_METADATA_FIELDS)('rejects removal of the exact %s host boundary and accepts restoration', (field) => {
    const metadata = config();
    const section = metadata[field];
    delete metadata[field];
    expect(() => assertSettingsRouteConfig(metadata)).toThrow(field);
    metadata[field] = section;
    expect(assertSettingsRouteConfig(metadata)).toBe(metadata);
  });

  it('keeps one topbar and mounts the actual capability controls in the additional Advanced section', async () => {
    start(config());
    await waitForPromises();
    expect(vm.$el.getAttribute('data-material-topbar-owner')).toBe('surface.settings');
    expect(vm.$el.textContent).toContain('Description and topics');
    vm.$children[0].selectTab('advanced');
    await waitForPromises();
    expect(vm.$el.querySelectorAll('#st-tabpanel-advanced')).toHaveLength(1);
    expect(vm.$el.querySelector('input[name="project[project_feature_attributes][wiki_access_level]"]')).not.toBeNull();
    expect(vm.$el.querySelector('textarea[name="project[issues_template]"]')).not.toBeNull();
    expect(vm.$el.querySelector('input[name="project[external_authorization_classification_label]"]')).not.toBeNull();
    expect(vm.$el.querySelector('input[name="new_namespace_id"]')).not.toBeNull();
    expect(vm.$el.textContent).toContain('Service Desk');
    expect(vm.$el.textContent).toContain('Secrets Manager permissions');
    expect(vm.$el.textContent).toContain('CI/CD Catalog project');
    expect(vm.$el.textContent).not.toContain('not represented here yet');
  });

  it('preserves the restricted edit route without loading or exposing administrator controls', async () => {
    const metadata = config();
    const adapter = start({ ...metadata, generalAllowed: false, permissionsMetadata: {}, serviceDeskMetadata: { supported: false }, specialMetadata: {}, secretsMetadata: { available: false }, duoContextMetadata: {}, advancedMetadata: { archive: { allowed: true, action: '/group/project/archive' } }, additionalMetadata: {} });
    await waitForPromises();
    expect(adapter.load).not.toHaveBeenCalled();
    expect(vm.$el.querySelectorAll('[role="tab"]')).toHaveLength(1);
    expect(vm.$el.textContent).toContain('Archive project');
    expect(vm.$el.textContent).not.toContain('Description and topics');
    expect(vm.$el.textContent).not.toContain('Settings data is unavailable');
  });
});
