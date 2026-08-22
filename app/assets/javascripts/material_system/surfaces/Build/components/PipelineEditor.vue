<template>
  <div id="build-panel-editor" role="tabpanel" aria-labelledby="build-tab-editor" class="pipeline-editor" data-screen-label="Pipeline editor">
    <div class="pipeline-editor__source">
      <label class="pipeline-editor__label" for="pipeline-yaml">.gitlab-ci.yml</label>
      <textarea
        id="pipeline-yaml"
        class="pipeline-editor__textarea"
        rows="18"
        spellcheck="false"
        :value="yaml"
        @input="$emit('update:yaml', $event.target.value)"
      ></textarea>
    </div>
    <div class="pipeline-editor__side">
      <div class="pipeline-editor__card">
        <div class="pipeline-editor__card-title">Lint</div>
        <div class="pipeline-editor__lint" :class="lint.valid ? 'pipeline-editor__lint--ok' : 'pipeline-editor__lint--bad'">
          <icon :name="lint.valid ? 'check_circle' : 'cancel'" />
          <span>{{ lint.message }}</span>
        </div>
      </div>
      <div class="pipeline-editor__card">
        <div class="pipeline-editor__card-title">Visualized stages</div>
        <template v-if="lint.stages.length">
          <div v-for="stage in lint.stages" :key="stage" class="pipeline-editor__stage">
            <icon name="pending" class="pipeline-editor__stage-dot" />{{ stage }}
          </div>
        </template>
        <p v-else class="pipeline-editor__muted">No stages declared yet.</p>
      </div>
      <button
        type="button"
        class="pipeline-editor__commit"
        :disabled="!lint.valid || busy"
        @click="$emit('commit')"
      >{{ committed ? 'Committed to main ✓' : busy ? 'Committing…' : 'Commit changes' }}</button>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import { lintPipelineYaml } from '../data';

export default {
  name: 'BuildPipelineEditor',
  components: { Icon },
  props: {
    yaml: { type: String, default: '' },
    committed: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
  },
  computed: {
    lint() {
      return lintPipelineYaml(this.yaml);
    },
  },
};
</script>
