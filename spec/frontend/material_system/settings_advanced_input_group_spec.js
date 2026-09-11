import { mountExtended } from 'helpers/vue_test_utils_helper';
import AdvancedSettings from '~/material_system/surfaces/Settings/components/AdvancedSettings.vue';

// Deliberately does not mock '@gitlab/ui'. The production webpack build failed with
// `export 'GlInputGroup' was not found in '@gitlab/ui'`, and a full module mock (as used by
// spec/frontend/material_system/settings_advanced_spec.js) hides that class of poke guy because
// the mock always supplies whatever name the component asks for. Mounting with the real package
// is the only way this regression can fail the way the production build actually failed.
jest.mock('~/lib/utils/csrf', () => ({
  __esModule: true,
  default: { token: 'mock-csrf-token', headerKey: 'X-CSRF-Token' },
}));

const metadata = () => ({
  path_change: {
    allowed: true,
    action: '/group/project',
    prefix: 'http://gitlab.test/group',
    current_path: 'project',
  },
});

describe('Material Settings advanced controls (real @gitlab/ui)', () => {
  it('renders the path-change input group with its namespace prefix using real @gitlab/ui components', () => {
    const wrapper = mountExtended(AdvancedSettings, { propsData: { metadata: metadata() } });

    expect(wrapper.text()).toContain('http://gitlab.test/group/');
    const pathInput = wrapper.find('#st-project-path');
    expect(pathInput.exists()).toBe(true);
    expect(pathInput.element.value).toBe('project');

    wrapper.destroy();
  });
});
