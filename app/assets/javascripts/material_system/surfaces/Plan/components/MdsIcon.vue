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
    <g v-else-if="name === 'construction'"><rect x="3" y="15" width="8" height="6" rx="1.5" transform="rotate(-45 7 18)" /><rect x="13" y="3" width="8" height="6" rx="1.5" transform="rotate(-45 17 6)" /><line x1="9.5" y1="14.5" x2="14.5" y2="9.5" /></g>
    <g v-else-if="name === 'command'"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></g>
    <g v-else-if="name === 'dark-mode'"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></g>
    <g v-else-if="name === 'light-mode'">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.5" y1="4.5" x2="6.6" y2="6.6" /><line x1="17.4" y1="17.4" x2="19.5" y2="19.5" />
      <line x1="4.5" y1="19.5" x2="6.6" y2="17.4" /><line x1="17.4" y1="6.6" x2="19.5" y2="4.5" />
    </g>
    <g v-else-if="name === 'flag'"><line x1="5" y1="3" x2="5" y2="21" /><path d="M5 4 H18 L14.5 8 L18 12 H5 Z" /></g>
    <g v-else-if="name === 'update'"><path d="M5 12a7 7 0 0 1 12-5" /><polyline points="17,3 17,7 13,7" /><path d="M19 12a7 7 0 0 1-12 5" /><polyline points="7,21 7,17 11,17" /></g>
    <g v-else-if="name === 'fact-check'"><rect x="5" y="3" width="14" height="18" rx="2" /><polyline points="8,9 9.5,10.5 12,7.5" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="17" x2="14" y2="17" /></g>
    <g v-else-if="name === 'menu-book'"><path d="M3 6c3-1.3 6-1.3 9 0v13c-3-1.3-6-1.3-9 0Z" /><path d="M21 6c-3-1.3-6-1.3-9 0v13c3-1.3 6-1.3 9 0Z" /></g>
    <g v-else-if="name === 'edit'"><path d="M4 20 L4 16.5 L15.5 5 L19 8.5 L7.5 20 Z" /><line x1="13.5" y1="7" x2="17" y2="10.5" /></g>
    <g v-else-if="name === 'check'"><polyline points="4,13 9,18 20,6" /></g>
    <g v-else-if="name === 'close'"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>
    <g v-else-if="name === 'delete'"><path d="M5 7h14" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5L17 7" /><line x1="10" y1="11" x2="10" y2="16" /><line x1="14" y1="11" x2="14" y2="16" /></g>
    <g v-else-if="name === 'copy'"><rect x="4" y="4" width="12" height="13" rx="1.5" /><path d="M9.5 18.5H18a1.5 1.5 0 0 0 1.5-1.5V7" /></g>
    <g v-else-if="name === 'download'"><line x1="12" y1="3" x2="12" y2="14" /><polyline points="7,10 12,15 17,10" /><line x1="5" y1="20" x2="19" y2="20" /></g>
    <g v-else-if="name === 'warning'"><path d="M12 4 21.5 20 2.5 20Z" /><line x1="12" y1="10" x2="12" y2="15" /><circle cx="12" cy="17.3" r="1" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'error'"><circle cx="12" cy="12" r="8.5" /><line x1="12" y1="7.5" x2="12" y2="13" /><circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'expand-more'"><polyline points="5,9 12,16 19,9" /></g>
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
