<template>
  <svg
    class="mg-icon"
    :class="`mg-icon--${size}`"
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
// Local, self-contained icon set (no remote font, no CDN). Each entry is a small
// inline SVG body keyed by a semantic name so callers never need to know the markup.
const ICONS = {
  search: '<circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />',
  command: '<rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" />',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />',
  commit: '<circle cx="12" cy="12" r="3" /><line x1="1" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="23" y2="12" />',
  merge: '<circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="6" r="2.4" /><path d="M6 8.4V15.6M8.4 6H14A4 4 0 0 1 18 10V15.6" />',
  check_circle: '<circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />',
  chat: '<path d="M4 5h16v11H8l-4 4z" />',
  shield: '<path d="M12 3l7 3v6c0 5-3.4 7.9-7 9-3.6-1.1-7-4-7-9V6z" />',
  tag: '<path d="M12 3h6a3 3 0 0 1 3 3v6L11 22 2 13 12 3z" /><circle cx="16.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.3 8.02 4 4 0 0 1 17 16H7z" />',
  delete: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />',
  close: '<line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />',
  external: '<path d="M14 4h6v6M20 4 10 14M6 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" />',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />',
  chevron_down: '<path d="m6 9 6 6 6-6" />',
  home: '<path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h12V9.5" />',
  group: '<circle cx="9" cy="8" r="3" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17.5" cy="9" r="2.5" /><path d="M14.5 20a5.5 5.5 0 0 1 8-4.9" />',
  flag: '<path d="M5 21V4" /><path d="M5 4h11l-2.5 4L16 12H5" />',
  code: '<path d="m9 8-5 4 5 4M15 8l5 4-5 4" />',
  build: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />',
  rocket: '<path d="M12 2c3 2 5 6 5 10 0 2-1 4-2 5l-3-1-3 1c-1-1-2-3-2-5 0-4 2-8 5-10Z" /><circle cx="12" cy="10" r="1.6" /><path d="M9 17l-2 4M15 17l2 4" />',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M9 20h6M12 16v4" />',
  chart: '<path d="M4 20V10M11 20V4M18 20v-7" />',
  settings: '<circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.4.7a7 7 0 0 0-2.8-1.6L13 2h-4l-.6 2.6a7 7 0 0 0-2.8 1.6l-2.4-.7-2 3.4 2 1.5A7 7 0 0 0 3 12c0 .5 0 1.1.2 1.6l-2 1.5 2 3.4 2.4-.7c.8.7 1.8 1.3 2.8 1.6L9 22h4l.6-2.6c1-.3 2-.9 2.8-1.6l2.4.7 2-3.4-2-1.5c.2-.5.2-1.1.2-1.6Z" />',
};

export default {
  name: 'MgIcon',
  props: {
    name: { type: String, required: true },
    size: { type: String, default: 'medium', validator: (v) => ['small', 'medium', 'large'].includes(v) },
  },
  computed: {
    path() {
      return ICONS[this.name] || ICONS.close;
    },
  },
};
</script>

<style scoped>
.mg-icon {
  display: block;
  flex-shrink: 0;
}
.mg-icon--small {
  width: 16px;
  height: 16px;
}
.mg-icon--medium {
  width: 20px;
  height: 20px;
}
.mg-icon--large {
  width: 24px;
  height: 24px;
}
</style>
