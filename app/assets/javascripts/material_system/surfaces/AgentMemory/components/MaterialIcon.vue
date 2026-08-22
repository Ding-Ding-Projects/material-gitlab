<template>
  <svg
    class="am-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="glyph"
  ></svg>
</template>

<script>
// Self-contained outlined icon set. No CDN, no remote font: every glyph the
// surface needs is drawn inline so nothing depends on network availability.
const GLYPHS = {
  search: '<circle cx="11" cy="11" r="6.5"/><line x1="20" y1="20" x2="15.5" y2="15.5"/>',
  tune: '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="var(--am-icon-fill,none)"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="var(--am-icon-fill,none)"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="var(--am-icon-fill,none)"/>',
  command: '<rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5" y1="5" x2="6.8" y2="6.8"/><line x1="17.2" y1="17.2" x2="19" y2="19"/><line x1="19" y1="5" x2="17.2" y2="6.8"/><line x1="6.8" y1="17.2" x2="5" y2="19"/>',
  robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><line x1="12" y1="3.5" x2="12" y2="8"/><circle cx="12" cy="3" r="1.1"/><circle cx="9" cy="13.2" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="13.2" r="1.3" fill="currentColor" stroke="none"/><line x1="9" y1="16.5" x2="15" y2="16.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/>',
  document: '<rect x="6" y="3.5" width="12" height="17" rx="1.5"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="11.5" x2="15" y2="11.5"/><line x1="9" y1="15" x2="13" y2="15"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><line x1="9" y1="2.5" x2="9" y2="7"/><line x1="15" y1="2.5" x2="15" y2="7"/><line x1="9" y1="17" x2="9" y2="21.5"/><line x1="15" y1="17" x2="15" y2="21.5"/><line x1="2.5" y1="9" x2="7" y2="9"/><line x1="2.5" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="21.5" y2="9"/><line x1="17" y1="15" x2="21.5" y2="15"/>',
  tram: '<rect x="5" y="4.5" width="14" height="12" rx="3"/><line x1="5" y1="10.5" x2="19" y2="10.5"/><line x1="9" y1="4.5" x2="9" y2="10.5"/><line x1="15" y1="4.5" x2="15" y2="10.5"/><circle cx="8.5" cy="19" r="1.4"/><circle cx="15.5" cy="19" r="1.4"/>',
  sparkle: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.6z"/>',
  rocket: '<path d="M12 2.5c3 1.6 4.8 4.8 4.8 8.6 0 2-.5 3.6-1.3 5l-1.8-1c.6-1.1.9-2.4.9-4 0-2.9-1.1-5.2-2.6-6.4-1.5 1.2-2.6 3.5-2.6 6.4 0 1.6.3 2.9.9 4l-1.8 1c-.8-1.4-1.3-3-1.3-5 0-3.8 1.8-7 4.8-8.6z"/><path d="M9 15.5L6.5 18l1 3 2.4-2.4"/><path d="M15 15.5L17.5 18l-1 3-2.4-2.4"/><circle cx="12" cy="10" r="1.4"/>',
  power: '<line x1="12" y1="3" x2="12" y2="11"/><path d="M7 6.5a7 7 0 1 0 10 0"/>',
  puzzle: '<path d="M9 4.5h4v2.2a1.6 1.6 0 0 0 2.8 1 1.6 1.6 0 0 1 2.7 1.1V13H16a1.6 1.6 0 0 0 0 3.2h2.5v4.3H14v-2.2a1.6 1.6 0 0 0-2.8-1 1.6 1.6 0 0 1-2.7-1.1V13H6.5a1.6 1.6 0 0 1 0-3.2H9V4.5z"/>',
  sync: '<path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.7"/><path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.3"/><polyline points="20 4 20 8.7 15.3 8.7"/><polyline points="4 20 4 15.3 8.7 15.3"/>',
  'check-circle': '<circle cx="12" cy="12" r="8.5"/><polyline points="8.2 12.3 10.8 14.9 15.8 9.4"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  'cloud-sync': '<path d="M7.5 17.5a4.3 4.3 0 0 1-.5-8.5 5.6 5.6 0 0 1 10.8-1.6A4 4 0 0 1 17 17.5"/><path d="M9.7 14.5a3 3 0 0 1 5-2.2l.9-.8"/><path d="M14.6 12.8v2h-2"/>',
  save: '<path d="M12 3v11"/><polyline points="7.5 10 12 14.5 16.5 10"/><path d="M5 17.5h14v3H5z"/>',
  pencil: '<path d="M4 20l1-4.3L15.7 5 19 8.3 8.3 19z"/><line x1="13.7" y1="6.9" x2="17" y2="10.2"/>',
  cap: '<path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M7 11v4.3c0 1.4 2.2 2.7 5 2.7s5-1.3 5-2.7V11"/><line x1="21" y1="8.5" x2="21" y2="14.5"/>',
  undo: '<path d="M7 7.5H14a5.5 5.5 0 1 1 0 11H10"/><polyline points="10 3.5 7 7.5 10 11.5"/>',
  send: '<path d="M4 12l16-8-6 16-3-6-7-2z"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  'check-box': '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><polyline points="8.2 12.3 10.8 14.7 15.8 9.4"/>',
  'check-box-blank': '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/>',
  'check-box-indeterminate': '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><line x1="8" y1="12" x2="16" y2="12"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V4.8h6V7"/><path d="M7 7l1 13h8l1-13"/><line x1="10" y1="10.5" x2="10" y2="17"/><line x1="14" y1="10.5" x2="14" y2="17"/>',
  warning: '<path d="M12 3.5L21.5 20h-19z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  clipboard: '<rect x="7" y="4.5" width="10" height="15" rx="1.5"/><rect x="9.3" y="2.5" width="5.4" height="3"/>',
  list: '<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>',
  merge: '<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 8.2V13a5 5 0 0 0 5 5h4.8"/><polyline points="13.5 15.5 15.8 17.5 13.5 19.5"/>',
  flag: '<line x1="6" y1="3" x2="6" y2="21"/><path d="M6 4.5h11l-2.5 3.5L17 11.5H6z"/>',
  book: '<path d="M5 4.5c2.5-1 5-1 7 0v14.5c-2-1-4.5-1-7 0z"/><path d="M19 4.5c-2.5-1-5-1-7 0v14.5c2-1 4.5-1 7 0z"/>',
  map: '<polygon points="4 5 9 3.5 15 5 20 3.5 20 18.5 15 20 9 18.5 4 20"/><line x1="9" y1="3.5" x2="9" y2="18.5"/><line x1="15" y1="5" x2="15" y2="20"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z"/><polyline points="9 12 11 14 15.5 9.3"/>',
  cloud: '<path d="M7.5 17.5a4.3 4.3 0 0 1-.5-8.5 5.6 5.6 0 0 1 10.8-1.6A4 4 0 0 1 17 17.5z"/>',
  chart: '<line x1="5" y1="19" x2="19" y2="19"/><rect x="6.5" y="12" width="3" height="7"/><rect x="11.5" y="8" width="3" height="11"/><rect x="16.5" y="14" width="3" height="5"/>',
  bug: '<rect x="8" y="8" width="8" height="10" rx="4"/><line x1="12" y1="4" x2="12" y2="8"/><line x1="5" y1="10" x2="8" y2="11.5"/><line x1="19" y1="10" x2="16" y2="11.5"/><line x1="5" y1="18" x2="8" y2="16.5"/><line x1="19" y1="18" x2="16" y2="16.5"/>',
  package: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><polyline points="4.5 7.5 12 12 19.5 7.5"/><line x1="12" y1="12" x2="12" y2="21"/>',
  login: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><polyline points="10 8 14 12 10 16"/><line x1="14" y1="12" x2="3" y2="12"/>',
  home: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9.5h12V10"/><rect x="10" y="14" width="4" height="5.5"/>',
  group: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15 19c0-2.2 1-4 3-4.6"/>',
  label: '<path d="M4 5h9l7 7-9 9-7-7z"/><circle cx="8.5" cy="9.5" r="1.3" fill="currentColor" stroke="none"/>',
};

export default {
  name: 'MaterialIcon',
  props: {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: [Number, String],
      default: 20,
    },
  },
  computed: {
    glyph() {
      return GLYPHS[this.name] || GLYPHS.circle;
    },
  },
};
</script>

<style scoped lang="scss">
.am-icon {
  display: block;
  flex-shrink: 0;
}
</style>
