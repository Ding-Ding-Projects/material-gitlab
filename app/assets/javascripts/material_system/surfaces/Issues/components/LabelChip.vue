<template>
  <span class="gl-mds-label-chip" :class="`gl-mds-label-chip--${size}`" :style="{ background: token.bg, color: token.fg }">
    {{ label }}
  </span>
</template>

<script>
import { labelToken } from '../data';

export default {
  name: 'LabelChip',
  props: {
    label: { type: String, required: true },
    size: { type: String, default: 'md', validator: (value) => ['sm', 'md'].includes(value) },
  },
  computed: {
    token() {
      return labelToken(this.label);
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-label-chip {
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  border-radius: 999px;
  white-space: nowrap;

  &--md { font-size: 11.5px; padding: 3px 10px; }
  &--sm { font-size: 11px; padding: 2px 9px; }
}
</style>
