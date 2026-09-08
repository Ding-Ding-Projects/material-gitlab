import { mount } from '@vue/test-utils';
import SpecialCapabilitiesSettings from '~/material_system/surfaces/Settings/components/SpecialCapabilitiesSettings.vue';
import { createSpecialCapabilitiesAdapter } from '~/material_system/surfaces/Settings/special_capabilities_adapter';

jest.mock('~/lib/utils/csrf', () => ({ token: 'csrf-value' }));
jest.mock('@gitlab/ui', () => ({
  GlAlert: {
    render(h) {
      return h('div', this.$slots.default);
    },
  },
  GlButton: {
    render(h) {
      return h('button', { on: this.$listeners }, this.$slots.default);
    },
  },
  GlForm: {
    render(h) {
      return h('form', { attrs: this.$attrs, on: this.$listeners }, this.$slots.default);
    },
  },
  GlFormCheckbox: {
    props: ['checked'],
    render(h) {
      return h('input', {
        attrs: { type: 'checkbox', checked: this.checked },
        on: this.$listeners,
      });
    },
  },
  GlFormGroup: {
    render(h) {
      return h('div', this.$slots.default);
    },
  },
  GlFormInput: {
    render(h) {
      return h('input', { on: this.$listeners });
    },
  },
}));

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});
const metadata = {
  graphql_endpoint: '/api/graphql',
  ci_catalog: { available: true, full_path: 'group/project' },
  secrets_manager: {
    available: true,
    allowed: true,
    full_path: 'group/project',
    enrollment_available: false,
  },
  bot_access: {
    available: true,
    allowed: true,
    action: '/group/project',
    group_search_endpoint: '/api/v4/groups/1/descendant_groups',
    enabled: true,
    file_patterns: ['ci/**/*.yml'],
    group_id: 4,
    root_group_id: 1,
    policy_access_available: true,
    policy_access_enabled: false,
    policy_access_locked: false,
  },
};

describe('specialized Settings design controls', () => {
  it('uses the existing catalog operation and rejects a non-boolean setting state', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        response({
          data: {
            project: {
              id: 'gid://gitlab/Project/1',
              isCatalogResource: false,
              description: 'A component',
            },
          },
        }),
      )
      .mockResolvedValueOnce(response({ data: { catalogResourcesCreate: { errors: [] } } }));
    const adapter = createSpecialCapabilitiesAdapter({ metadata, fetchImpl });
    await expect(adapter.loadCatalog()).resolves.toEqual({
      enabled: false,
      description: 'A component',
    });
    await adapter.setCatalog(true);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toMatchObject({
      variables: { input: { projectPath: 'group/project' } },
    });
    await expect(adapter.setCatalog('true')).rejects.toThrow('enabled or disabled');
  });

  it('reads Secrets Manager lifecycle metadata without selecting secret values and rejects malformed results', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        response({
          data: { secretsManager: { status: 'active', entity: { id: 'gid://gitlab/Project/1' } } },
        }),
      )
      .mockResolvedValueOnce(response({ data: { secretsManager: {} } }));
    const adapter = createSpecialCapabilitiesAdapter({ metadata, fetchImpl });
    await expect(adapter.loadSecrets()).resolves.toMatchObject({
      available: true,
      status: 'active',
      enrolled: false,
    });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).query).not.toMatch(/\bsecret\b.*\bvalue\b/i);
    await expect(adapter.loadSecrets()).rejects.toThrow('lifecycle metadata');
  });

  it('requires an explicit lifecycle status after a Secrets Manager mutation', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response({
        data: { projectSecretsManagerInitialize: { errors: [], projectSecretsManager: {} } },
      }),
    );
    const adapter = createSpecialCapabilitiesAdapter({ metadata, fetchImpl });
    await expect(adapter.setSecrets(true)).rejects.toThrow('did not confirm');
  });

  it('searches the existing descendant-groups endpoint and returns group metadata only', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(response([{ id: 4, name: 'Policies', full_path: 'group/policies' }]));
    const adapter = createSpecialCapabilitiesAdapter({ metadata, fetchImpl });
    await expect(adapter.searchBotGroups('policy')).resolves.toEqual([
      { id: 4, name: 'Policies', fullPath: 'group/policies' },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/v4/groups/1/descendant_groups?search=policy'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        redirect: 'error',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-value' }),
      }),
    );
  });

  it('requires confirmation before removals and renders the native PATCH policy form', async () => {
    const wrapper = mount(SpecialCapabilitiesSettings, { propsData: { metadata }, stubs: { GlForm: false } });
    wrapper.setData({
      adapter: { setCatalog: jest.fn(), setSecrets: jest.fn() },
      catalog: { enabled: true, description: 'A component' },
      secrets: { status: 'active', enrolled: false },
      bot: { ...wrapper.vm.bot, enabled: true, patternText: '' },
    });
    await wrapper.vm.onCatalogChange(false);
    expect(wrapper.vm.pendingAction).toMatchObject({ type: 'catalog' });
    wrapper.vm.requestSecretsRemoval();
    expect(wrapper.vm.pendingAction).toMatchObject({ type: 'secrets' });
    const event = { preventDefault: jest.fn() };
    wrapper.vm.validateBotSubmit(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(wrapper.vm.botError).toBe('Add at least one allowed file pattern before saving.');
    expect(wrapper.find('form').attributes('action')).toBe('/group/project');
    expect(wrapper.find('input[name="_method"]').attributes('value')).toBe('patch');
    expect(
      wrapper
        .find('input[name="project[project_setting_attributes][spp_repository_pipeline_access]"]')
        .exists(),
    ).toBe(true);
    wrapper.destroy();
  });
});
