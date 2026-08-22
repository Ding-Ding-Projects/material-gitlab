<template>
  <span class="status-badge" :style="{ background: bg, color: fg }">{{ text }}</span>
</template>

<script>
export default {
  name: 'BuildStatusBadge',
  props: {
    text: { type: String, required: true },
    bg: { type: String, required: true },
    fg: { type: String, required: true },
  },
};
</script>
