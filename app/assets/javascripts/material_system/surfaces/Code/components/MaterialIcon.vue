<template>
  <svg
    class="gl-code-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </template>
    <template v-else-if="name === 'construction'">
      <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'command'">
      <path d="M8 4a2 2 0 1 0 0 4h8a2 2 0 1 0 0-4H8z" transform="translate(0,0)" />
      <rect x="6" y="6" width="12" height="12" rx="3" />
      <circle cx="9" cy="9" r="1.4" />
      <circle cx="15" cy="9" r="1.4" />
      <circle cx="9" cy="15" r="1.4" />
      <circle cx="15" cy="15" r="1.4" />
    </template>
    <template v-else-if="name === 'dark_mode'">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </template>
    <template v-else-if="name === 'light_mode'">
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="2.5" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="4.9" y1="4.9" x2="6.6" y2="6.6" /><line x1="17.4" y1="17.4" x2="19.1" y2="19.1" />
      <line x1="4.9" y1="19.1" x2="6.6" y2="17.4" /><line x1="17.4" y1="6.6" x2="19.1" y2="4.9" />
    </template>
    <template v-else-if="name === 'arrow_forward'">
      <line x1="4" y1="12" x2="20" y2="12" /><polyline points="13,5 20,12 13,19" />
    </template>
    <template v-else-if="name === 'check_circle'">
      <circle cx="12" cy="12" r="9" /><polyline points="8,12.5 11,15.5 16,9" />
    </template>
    <template v-else-if="name === 'sync'">
      <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8" />
      <polyline points="20,3 20,8 15,8" />
      <path d="M20 12a8 8 0 0 1-13.66 5.66L4 16" />
      <polyline points="4,21 4,16 9,16" />
    </template>
    <template v-else-if="name === 'cancel'">
      <circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
    </template>
    <template v-else-if="name === 'account_tree'">
      <circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="12" r="2.2" />
      <path d="M6 8.2V15.8" /><path d="M8 6h4a4 4 0 0 1 4 4" /><path d="M8 18h4a4 4 0 0 0 4-4" />
    </template>
    <template v-else-if="name === 'commit'">
      <line x1="2.5" y1="12" x2="7.5" y2="12" /><line x1="16.5" y1="12" x2="21.5" y2="12" />
      <circle cx="12" cy="12" r="4.5" />
    </template>
    <template v-else-if="name === 'sell'">
      <path d="M20 12.6 12.6 20a1.4 1.4 0 0 1-2 0L4 13.4V4h9.4l6.6 6.6a1.4 1.4 0 0 1 0 2z" />
      <circle cx="8.2" cy="8.2" r="1.4" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'sticky_note_2'">
      <path d="M4 4h13l3 3v13H4z" /><path d="M17 4v5h5" />
      <line x1="8" y1="12" x2="15" y2="12" /><line x1="8" y1="16" x2="13" y2="16" />
    </template>
    <template v-else-if="name === 'close'">
      <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
    </template>
    <template v-else-if="name === 'delete'">
      <polyline points="4,7 20,7" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" />
      <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </template>
    <template v-else-if="name === 'content_copy'">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </template>
    <template v-else-if="name === 'warning'">
      <path d="M12 3.5 21.5 20h-19z" /><line x1="12" y1="9.5" x2="12" y2="14" /><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'check'">
      <polyline points="4,12.5 9,17.5 20,6.5" />
    </template>
  </svg>
</template>

<script>
export default {
  name: 'MaterialIcon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 20 },
  },
};
</script>

<style lang="scss" scoped>
.gl-code-icon {
  display: block;
  flex-shrink: 0;
}
</style>
