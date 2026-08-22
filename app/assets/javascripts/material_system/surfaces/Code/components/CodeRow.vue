<template>
  <div class="gl-code-row" :class="{ 'is-selected': selected }">
    <input
      type="checkbox"
      class="gl-code-checkbox"
      :checked="selected"
      :aria-label="`Select ${row.title}`"
      @change="$emit('toggle', row.id)"
    >
    <span class="gl-code-row__icon" :style="{ color: row.iconColor }">
      <material-icon :name="row.icon" :size="19" />
    </span>
    <div class="gl-code-row__body">
      <div class="gl-code-row__title" :class="{ 'gl-code-row__title--mono': row.titleMono }">{{ row.title }}</div>
      <div class="gl-code-row__sub">{{ row.sub }}</div>
    </div>
    <span
      v-if="row.badge"
      class="gl-code-badge"
      :style="{ background: row.badgeBg, color: row.badgeFg }"
    >{{ row.badge }}</span>
    <span class="gl-code-meta">{{ row.meta }}</span>
    <button
      v-if="row.actionLabel"
      type="button"
      class="gl-code-row__action"
      :style="{ color: row.actionColor }"
      @click="row.onAction && row.onAction()"
    >{{ row.actionLabel }}</button>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'CodeRow',
  components: { MaterialIcon },
  props: {
    row: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>
