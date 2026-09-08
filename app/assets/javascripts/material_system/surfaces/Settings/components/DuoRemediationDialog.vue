<template>
  <ConfirmDialog title="Turn on dependency version bumps" description="Attach the required remediation profile before enabling Agentic Breaking Change Resolution. This allows the existing service to propose fixes for vulnerable dependencies." :busy="loading" :confirm-label="loading ? 'Attaching profile…' : 'Turn on dependency version bumps'" @confirm="$emit('attach')" @cancel="$emit('cancel')">
    <p v-if="error" role="alert">{{ error }}</p>
  </ConfirmDialog>
</template>

<script>
import ConfirmDialog from './ConfirmDialog.vue';

export default {
  name: 'DuoRemediationDialog',
  components: { ConfirmDialog },
  props: { loading: { type: Boolean, default: false }, error: { type: String, default: '' } },
};
</script>
