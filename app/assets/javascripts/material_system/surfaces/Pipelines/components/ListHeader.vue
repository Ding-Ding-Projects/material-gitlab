<template>
  <div class="mgl-pl-list-header">
    <h1>Pipelines</h1>
    <span class="mgl-pl-count">{{ countLabel }}</span>
    <material-button variant="filled" type="button" class="mgl-pl-run-btn" @click="$emit('run')">
      <span class="mgl-icon" aria-hidden="true">play_arrow</span>Run pipeline
    </material-button>
  </div>
</template>

<script>
import MaterialButton from '../../../components/material_button';
export default {
  components: { MaterialButton },
  name: 'PipelinesListHeader',
  props: {
    countLabel: { type: String, required: true },
  },
};
</script>
