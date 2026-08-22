<template>
  <svg
    class="st-icon"
    :class="`st-icon--${size}`"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="path"
  />
</template>

<script>
// Local, self-contained icon set (no remote font, no CDN). Each entry is a
// small inline SVG body keyed by a semantic name so callers never need to
// know the markup.
const ICONS = {
  search: '<circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />',
  command: '<rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" />',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />',
  close: '<line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />',
  chevron_down: '<path d="m6 9 6 6 6-6" />',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />',
  shield: '<path d="M12 3l7 3v6c0 5-3.4 7.9-7 9-3.6-1.1-7-4-7-9V6z" />',
  public: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />',
  upload: '<path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />',
  upload_file: '<rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 17V9M9 12l3-3 3 3" />',
  swap_horiz: '<path d="m6 9 -3 3 3 3M2 12h13" /><path d="m18 15 3-3-3-3M22 12H9" />',
  add: '<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />',
  delete: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />',
  visibility: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />',
  visibility_off: '<path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 3.4-.6" /><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />',
  notifications: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M9.5 20a2.5 2.5 0 0 0 5 0" />',
  link: '<path d="M9 15l6-6" /><path d="M13 6l1.5-1.5a3.5 3.5 0 0 1 5 5L18 11" /><path d="M11 18l-1.5 1.5a3.5 3.5 0 0 1-5-5L6 13" />',
  monitoring: '<path d="M4 20V10M11 20V4M18 20v-7" />',
  forum: '<path d="M4 5h16v11H8l-4 4z" />',
  more_vert: '<circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" />',
  group: '<circle cx="9" cy="8" r="3" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17.5" cy="9" r="2.5" /><path d="M14.5 20a5.5 5.5 0 0 1 8-4.9" />',
  settings: '<circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.4.7a7 7 0 0 0-2.8-1.6L13 2h-4l-.6 2.6a7 7 0 0 0-2.8 1.6l-2.4-.7-2 3.4 2 1.5A7 7 0 0 0 3 12c0 .5 0 1.1.2 1.6l-2 1.5 2 3.4 2.4-.7c.8.7 1.8 1.3 2.8 1.6L9 22h4l.6-2.6c1-.3 2-.9 2.8-1.6l2.4.7 2-3.4-2-1.5c.2-.5.2-1.1.2-1.6Z" />',
  dark_mode: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />',
  check_circle: '<circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />',
};

export default {
  name: 'StIcon',
  props: {
    name: { type: String, required: true },
    size: { type: String, default: 'medium', validator: (value) => ['small', 'medium', 'large'].includes(value) },
  },
  computed: {
    path() {
      return ICONS[this.name] || ICONS.close;
    },
  },
};
</script>

<style scoped>
.st-icon {
  display: block;
  flex-shrink: 0;
}
.st-icon--small {
  width: 16px;
  height: 16px;
}
.st-icon--medium {
  width: 20px;
  height: 20px;
}
.st-icon--large {
  width: 26px;
  height: 26px;
}
</style>
