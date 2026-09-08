<template>
  <div class="mr-list-item" :data-selected="selected">
    <input
      type="checkbox"
      class="mr-list-item__checkbox"
      :checked="selected"
      :aria-label="`Select merge request: ${mr.title}`"
      @change="$emit('toggle-select', mr.id)"
    />
    <material-button variant="text" type="button" class="mr-list-item__open" @click="$emit('open', mr.id)">
      <span
        class="material-symbols-outlined mr-list-item__state-icon"
        :style="{ color: `var(${state.colorVar})` }"
        aria-hidden="true"
      >
        {{ state.icon }}
      </span>
      <span class="mr-sr-only">{{ mr.state }}.</span>
      <span class="mr-list-item__main">
        <span class="mr-list-item__title">{{ mr.title }}</span>
        <span class="mr-list-item__meta">!{{ mr.iid }} · {{ mr.branch }} → {{ mr.target }} · {{ metaLabel }}</span>
      </span>
      <span
        class="material-symbols-outlined mr-list-item__pipeline"
        :style="{ color: `var(${pipeline.colorVar})` }"
        :title="pipeline.label"
        aria-hidden="true"
      >
        {{ pipeline.icon }}
      </span>
      <span class="mr-sr-only">{{ pipeline.label }}.</span>
      <span class="mr-list-item__stat">
        <span class="material-symbols-outlined mr-list-item__stat-icon" aria-hidden="true">verified</span>
        {{ mr.approvals }}
        <span class="mr-sr-only">approvals</span>
      </span>
      <span class="mr-list-item__stat">
        <span class="material-symbols-outlined mr-list-item__stat-icon" aria-hidden="true">chat_bubble</span>
        {{ mr.discussionCount == null ? 'Unavailable' : mr.discussionCount }}
        <span class="mr-sr-only">comments</span>
      </span>
      <span class="mr-list-item__avatar" :title="mr.author" aria-hidden="true">{{ avatar }}</span>
      <span class="mr-sr-only">Author: {{ mr.author }}.</span>
    </material-button>
    <gl-link v-if="mr.webUrl" :href="mr.webUrl">Open full review</gl-link>
  </div>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';

import { GlLink } from '@gitlab/ui';
import { avatarInitials, stateVisuals, PIPELINE_STATUS_META } from '../data';

export default {
  name: 'MrListItem',
  components: { MaterialButton, GlLink },
  props: {
    mr: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  computed: {
    avatar() {
      return avatarInitials(this.mr.author);
    },
    state() {
      return stateVisuals(this.mr.state);
    },
    pipeline() {
      return PIPELINE_STATUS_META[this.mr.pipeline] || PIPELINE_STATUS_META.unknown;
    },
    metaLabel() {
      return this.mr.state === 'Merged' ? `merged · ${this.mr.author}` : `opened ${this.mr.when} · ${this.mr.author}`;
    },
  },
};
</script>
