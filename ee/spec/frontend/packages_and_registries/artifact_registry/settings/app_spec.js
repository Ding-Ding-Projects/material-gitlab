import { shallowMountExtended } from 'helpers/vue_test_utils_helper';
import SettingsBlock from '~/vue_shared/components/settings/settings_block.vue';
import App from 'ee/packages_and_registries/artifact_registry/settings/app.vue';
import ActivationSection from 'ee/packages_and_registries/artifact_registry/settings/activation_section.vue';

describe('ArtifactRegistrySettingsApp', () => {
  let wrapper;

  const createComponent = () => {
    wrapper = shallowMountExtended(App);
  };

  const findSettingsBlock = () => wrapper.findComponent(SettingsBlock);

  beforeEach(() => createComponent());

  it('renders the Activation settings block', () => {
    expect(findSettingsBlock().props('title')).toBe('Activation');
  });

  it('describes the section as controlling access rather than creating a registry', () => {
    expect(findSettingsBlock().text()).toContain(
      'Control artifact registry access for this organization. When enabled, all projects and groups have access to a unified registry.',
    );
  });

  it('renders the activation section inside the block', () => {
    expect(findSettingsBlock().findComponent(ActivationSection).exists()).toBe(true);
  });
});
