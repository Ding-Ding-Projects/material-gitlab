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
    <g v-else-if="name === 'close'"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>
    <g v-else-if="name === 'check'"><polyline points="4,13 9,18 20,6" /></g>
    <g v-else-if="name === 'check-circle'"><circle cx="12" cy="12" r="8.5" /><polyline points="8,12.5 11,15.5 16,9" /></g>
    <g v-else-if="name === 'error'"><circle cx="12" cy="12" r="8.5" /><line x1="12" y1="7.5" x2="12" y2="13" /><circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'info'"><circle cx="12" cy="12" r="8.5" /><line x1="12" y1="10.5" x2="12" y2="16.5" /><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'delete'"><path d="M5 7h14" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5L17 7" /><line x1="10" y1="11" x2="10" y2="16" /><line x1="14" y1="11" x2="14" y2="16" /></g>
    <g v-else-if="name === 'copy'"><rect x="4" y="4" width="12" height="13" rx="1.5" /><path d="M9.5 18.5H18a1.5 1.5 0 0 0 1.5-1.5V7" /></g>
    <g v-else-if="name === 'expand-more'"><polyline points="5,9 12,16 19,9" /></g>
    <g v-else-if="name === 'chevron-right'"><polyline points="9,5 16,12 9,19" /></g>
    <g v-else-if="name === 'flag'"><path d="M6 3v18" /><path d="M6 4h11l-2 4 2 4H6Z" /></g>
    <g v-else-if="name === 'tune'"><line x1="4" y1="7" x2="20" y2="7" /><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" /><line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'command'"><rect x="4" y="4" width="16" height="16" rx="4" /><line x1="9" y1="4" x2="9" y2="20" /><line x1="15" y1="4" x2="15" y2="20" /><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /></g>
    <g v-else-if="name === 'sun'"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /><line x1="4.9" y1="4.9" x2="7" y2="7" /><line x1="17" y1="17" x2="19.1" y2="19.1" /><line x1="4.9" y1="19.1" x2="7" y2="17" /><line x1="17" y1="7" x2="19.1" y2="4.9" /></g>
    <g v-else-if="name === 'moon'"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></g>
    <g v-else-if="name === 'download'"><path d="M12 3v12" /><polyline points="7,10 12,15 17,10" /><path d="M5 19h14" /></g>
    <g v-else-if="name === 'refresh'"><path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.5" /><polyline points="20,4 20,8.5 15.5,8.5" /><path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.5" /><polyline points="4,20 4,15.5 8.5,15.5" /></g>
    <g v-else-if="name === 'timeline'"><path d="M3 17l5-6 4 3 6-8 3 3" /><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'list'"><line x1="8" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="8" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" /></g>
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
