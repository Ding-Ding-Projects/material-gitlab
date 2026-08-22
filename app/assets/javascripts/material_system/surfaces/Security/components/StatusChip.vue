<script>
export default {
  name: 'StatusChip',
  props: {
    label: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      required: false,
      default: false,
    },
    bg: {
      type: String,
      required: true,
    },
    fg: {
      type: String,
      required: true,
    },
  },
  computed: {
    style() {
      return {
        background: this.active ? this.bg : 'transparent',
        color: this.active ? this.fg : 'var(--sec-onsurf-v)',
        borderColor: this.active ? this.bg : 'var(--sec-outl)',
      };
    },
  },
};
</script>

<template>
  <button
    type="button"
    class="sec-chip"
    :style="style"
    :aria-pressed="active"
    @click="$emit('pick')"
  >
    {{ label }}
  </button>
</template>
