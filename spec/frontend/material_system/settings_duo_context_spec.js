import { shallowMount } from '@vue/test-utils';
import DuoContextSettings from '~/material_system/surfaces/Settings/components/DuoContextSettings.vue';

jest.mock('~/lib/utils/csrf', () => ({ token: 'csrf-value' }));
jest.mock('@gitlab/ui', () => ({
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
  GlLink: {
    render(h) {
      return h('a', { attrs: this.$attrs }, this.$slots.default);
    },
  },
}));

const metadata = {
  allowed: true,
  action: '/group/project',
  exclusion_rules: ['docs/private/**'],
  governance_path: '/group/project/-/settings/gitlab_duo/governance',
  duo_readiness_available: true,
  duo_features_enabled: true,
  remote_flows_enabled: true,
  duo_readiness: {
    platformEnabled: true,
    groupSettingsPath: '/groups/group/-/settings/gitlab_duo',
    adminSettingsPath: '/admin/application_settings/general',
    runnersPath: '/group/project/-/settings/ci_cd#js-runners-settings',
  },
};

describe('Duo context Settings', () => {
  it('uses exact nested exclusion field names and keeps the null empty-list behavior', () => {
    const wrapper = shallowMount(DuoContextSettings, { propsData: { metadata } });
    expect(
      wrapper
        .find(
          'input[name="project[project_setting_attributes][duo_context_exclusion_settings][exclusion_rules][]"]',
        )
        .attributes('value'),
    ).toBe('docs/private/**');
    wrapper.vm.removeRule(0);
    return wrapper.vm
      .$nextTick()
      .then(() =>
        expect(
          wrapper
            .find(
              'input[name="project[project_setting_attributes][duo_context_exclusion_settings][exclusion_rules]"]',
            )
            .exists(),
        ).toBe(true),
      );
  });

  it('edits rules locally and preserves existing governance and setup destinations', () => {
    const wrapper = shallowMount(DuoContextSettings, { propsData: { metadata } });
    wrapper.setData({ newRule: 'vendor/**' });
    wrapper.vm.addRule();
    expect(wrapper.vm.rules).toEqual(['docs/private/**', 'vendor/**']);
    expect(wrapper.text()).toContain('Open governance');
    expect(wrapper.text()).toContain('Open runners');
  });
});
