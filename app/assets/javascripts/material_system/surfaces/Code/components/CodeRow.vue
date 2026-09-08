<template>
  <div class="gl-code-row" :class="{ 'is-selected': selected }">
    <material-checkbox
      class="gl-code-checkbox"
      :checked="selected"
      :aria-label="`Select ${row.title}`"
      @change="$emit('toggle', row.id)"
    ></material-checkbox>
    <span class="gl-code-row__icon" :style="{ color: row.iconColor }">
      <material-icon :name="row.icon" :size="19" />
    </span>
    <div class="gl-code-row__body">
      <a v-if="row.href" :href="row.href" class="gl-code-row__title">{{ row.title }}</a>
      <div v-else class="gl-code-row__title" :class="{ 'gl-code-row__title--mono': row.titleMono }">{{ row.title }}</div>
      <div class="gl-code-row__sub">{{ row.sub }}</div>
    </div>
    <span
      v-if="row.badge"
      class="gl-code-badge"
      :style="{ background: row.badgeBg, color: row.badgeFg }"
    >{{ row.badge }}</span>
    <span class="gl-code-meta">{{ row.meta }}</span>
    <material-button
      v-if="row.actionLabel"
      type="button"
      variant="text"
      class="gl-code-row__action"
      :style="{ color: row.actionColor }"
      @click="row.onAction && row.onAction()"
    >{{ row.actionLabel }}</material-button>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';
import MaterialButton from '../../../components/material_button';
import MaterialCheckbox from '../../../components/material_checkbox';

export default {
  name: 'CodeRow',
  components: { MaterialIcon, MaterialButton, MaterialCheckbox },
  props: {
    row: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>
