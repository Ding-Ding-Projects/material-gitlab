<script>
import { severityColorVars, severityLabel } from '../data';

export default {
  name: 'SeverityBadge',
  props: {
    severity: {
      type: String,
      required: true,
    },
  },
  computed: {
    label() {
      return severityLabel(this.severity);
    },
    colorVars() {
      return severityColorVars(this.severity);
    },
    style() {
      return { background: this.colorVars.bg, color: this.colorVars.fg };
    },
  },
};
</script>

<template>
  <span class="sec-badge sec-severity-badge" :style="style">{{ label }}</span>
</template>
