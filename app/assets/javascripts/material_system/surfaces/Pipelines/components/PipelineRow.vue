<template>
  <li class="mgl-pl-row" :class="{ 'is-selected': selected }">
    <input
      type="checkbox"
      class="mgl-pl-row-check"
      :checked="selected"
      :aria-label="`Select pipeline #${pipeline.id}, ${pipeline.title}`"
      @change="$emit('toggle-select', pipeline.id)"
    />
    <button type="button" class="mgl-pl-row-open" @click="$emit('open', pipeline.id)">
      <span class="mgl-pl-badge" :style="{ background: badge.bg, color: badge.fg }">
        <span
          class="mgl-icon mgl-icon--sm"
          :class="{ 'mgl-icon--spin': pipeline.status === 'running' }"
          aria-hidden="true"
          >{{ badge.icon }}</span
        >{{ pipeline.status }}
      </span>
      <span class="mgl-pl-row-main">
        <span class="mgl-pl-row-title">{{ pipeline.title }}</span>
        <span class="mgl-pl-row-meta">
          #{{ pipeline.id }} · <span class="mgl-pl-sha">{{ pipeline.sha }}</span> · {{ pipeline.branch }} · {{ pipeline.origin }}
        </span>
      </span>
      <stage-dots :stages="pipeline.stages" />
      <span class="mgl-pl-row-duration">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">schedule</span>{{ pipeline.duration }}
      </span>
    </button>
  </li>
</template>

<script>
import { statusMeta } from '../data';
import StageDots from './StageDots.vue';

export default {
  name: 'PipelinesRow',
  components: { StageDots },
  props: {
    pipeline: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  computed: {
    badge() {
      return statusMeta(this.pipeline.status);
    },
  },
};
</script>
