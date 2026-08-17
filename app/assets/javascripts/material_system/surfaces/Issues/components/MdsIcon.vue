<template>
  <svg
    class="gl-mds-icon"
    :class="`gl-mds-icon--${size}`"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <g v-if="name === 'search'"><circle cx="10.5" cy="10.5" r="6.5" /><line x1="20" y1="20" x2="15.3" y2="15.3" /></g>
    <g v-else-if="name === 'add'"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></g>
    <g v-else-if="name === 'close'"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>
    <g v-else-if="name === 'check'"><polyline points="4,13 9,18 20,6" /></g>
    <g v-else-if="name === 'check-circle'"><circle cx="12" cy="12" r="8.5" /><polyline points="8,12.5 11,15.5 16,9" /></g>
    <g v-else-if="name === 'open-state'"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'construction'"><rect x="3" y="15" width="8" height="6" rx="1.5" transform="rotate(-45 7 18)" /><rect x="13" y="3" width="8" height="6" rx="1.5" transform="rotate(-45 17 6)" /><line x1="9.5" y1="14.5" x2="14.5" y2="9.5" /></g>
    <g v-else-if="name === 'delete'"><path d="M5 7h14" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5L17 7" /><line x1="10" y1="11" x2="10" y2="16" /><line x1="14" y1="11" x2="14" y2="16" /></g>
    <g v-else-if="name === 'more-vert'"><circle cx="12" cy="5.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="18.5" r="1.1" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'drag'"><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'label'"><path d="M3 11.5V6a2 2 0 0 1 2-2h5.5a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 11.5Z" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'person'"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></g>
    <g v-else-if="name === 'expand-more'"><polyline points="5,9 12,16 19,9" /></g>
    <g v-else-if="name === 'error'"><circle cx="12" cy="12" r="8.5" /><line x1="12" y1="7.5" x2="12" y2="13" /><circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'info'"><circle cx="12" cy="12" r="8.5" /><line x1="12" y1="10.5" x2="12" y2="16.5" /><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'copy'"><rect x="4" y="4" width="12" height="13" rx="1.5" /><path d="M9.5 18.5H18a1.5 1.5 0 0 0 1.5-1.5V7" /></g>
    <g v-else-if="name === 'undo'"><path d="M6 8H14a5 5 0 0 1 0 10H10" /><polyline points="9,4 5,8 9,12" /></g>
    <g v-else><circle cx="12" cy="12" r="8.5" /></g>
  </svg>
</template>

<script>
export default {
  name: 'MdsIcon',
  props: {
    name: { type: String, required: true },
    size: { type: String, default: 'md', validator: (value) => ['sm', 'md', 'lg'].includes(value) },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-icon {
  display: inline-block;
  flex-shrink: 0;

  &--sm { width: 16px; height: 16px; }
  &--md { width: 20px; height: 20px; }
  &--lg { width: 24px; height: 24px; }
}
</style>
