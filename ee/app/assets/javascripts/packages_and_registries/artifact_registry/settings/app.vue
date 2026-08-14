<script>
import { s__ } from '~/locale';
import SettingsBlock from '~/vue_shared/components/settings/settings_block.vue';
import ActivationSection from './activation_section.vue';

export default {
  name: 'ArtifactRegistrySettingsApp',
  components: { ActivationSection, SettingsBlock },
  i18n: {
    activationTitle: s__('ArtifactRegistry|Activation'),
    activationDescription: s__(
      'ArtifactRegistry|Control artifact registry access for this organization. When enabled, all projects and groups have access to a unified registry.',
    ),
  },
};
</script>

<template>
  <settings-block :title="$options.i18n.activationTitle" expanded>
    <template #description>{{ $options.i18n.activationDescription }}</template>
    <template #default>
      <activation-section />
    </template>
  </settings-block>
</template>
