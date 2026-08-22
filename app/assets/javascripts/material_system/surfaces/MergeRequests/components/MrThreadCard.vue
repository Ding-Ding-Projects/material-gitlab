<template>
  <div class="mr-card mr-thread">
    <div class="mr-thread__avatar" aria-hidden="true">{{ avatar }}</div>
    <div class="mr-thread__body">
      <div class="mr-thread__meta">
        <span class="mr-thread__author">{{ thread.author }}</span>
        <span class="mr-thread__when">{{ thread.when }}</span>
        <span v-if="thread.resolved" class="mr-thread__resolved-badge">Resolved</span>
      </div>
      <div class="mr-thread__text">{{ thread.text }}</div>
      <button type="button" class="mr-thread__resolve-btn" @click="$emit('toggle-resolve')">
        {{ thread.resolved ? 'Unresolve' : 'Resolve thread' }}
      </button>
    </div>
  </div>
</template>

<script>
import { avatarInitials } from '../data';

export default {
  name: 'MrThreadCard',
  props: {
    thread: { type: Object, required: true },
  },
  computed: {
    avatar() {
      return avatarInitials(this.thread.author);
    },
  },
};
</script>
