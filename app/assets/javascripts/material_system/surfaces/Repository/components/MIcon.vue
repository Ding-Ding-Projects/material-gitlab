<script>
// Local inline-SVG icon set. The design references a remotely-hosted Material
// Symbols font; the product-wide "no remote font" rule forbids that CDN
// dependency, so this primitive draws the same glyph meanings as small,
// self-contained SVG paths instead.
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.6-3.6a6 6 0 0 1-7.8 7.8l-6.7 6.7a2.1 2.1 0 0 1-3-3l6.7-6.7a6 6 0 0 1 7.8-7.8l-3.6 3.6z"/>',
  command: '<path d="M4 7l5 5-5 5"/><line x1="12" y1="18" x2="20" y2="18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3.5z"/>',
  fork: '<circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M6 8.3V11a3.5 3.5 0 0 0 3.5 3.5M18 8.3V11A3.5 3.5 0 0 1 14.5 14.5"/>',
  download: '<path d="M12 3v11"/><path d="M7.5 10l4.5 4.5L16.5 10"/><path d="M5 19.5h14"/>',
  branch: '<circle cx="6" cy="6" r="2.1"/><circle cx="6" cy="18" r="2.1"/><circle cx="17.5" cy="12" r="2.1"/><path d="M6 8.1V15.9M8.1 12h7.3"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  'chevron-right': '<polyline points="9 6 15 12 9 18"/>',
  file: '<path d="M7 3h6l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><polyline points="13 3 13 8 18 8"/>',
  folder: '<path d="M4 6.2A1.2 1.2 0 0 1 5.2 5h4.3l2 2H19a1.2 1.2 0 0 1 1.2 1.2v9.6A1.2 1.2 0 0 1 19 19H5.2A1.2 1.2 0 0 1 4 17.8z"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  check: '<polyline points="5 13 9.5 17.5 19 7"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  warning: '<path d="M12 3.4l9.4 16.6H2.6L12 3.4z"/><line x1="12" y1="9.5" x2="12" y2="13.8"/><circle cx="12" cy="16.8" r="0.65" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.2"/><circle cx="12" cy="7.6" r="0.65" fill="currentColor" stroke="none"/>',
  swap: '<path d="M6 8h11l-3-3M18 16H7l3 3"/>',
};

export default {
  name: 'MIcon',
  props: {
    name: {
      type: String,
      required: true,
      validator: (value) => Object.prototype.hasOwnProperty.call(ICONS, value),
    },
    size: {
      type: [Number, String],
      default: 20,
    },
    // Decorative icons are hidden from assistive tech; set false and pass
    // `label` when the icon is the only content conveying meaning.
    decorative: {
      type: Boolean,
      default: true,
    },
    label: {
      type: String,
      default: '',
    },
  },
  computed: {
    glyph() {
      return ICONS[this.name] || '';
    },
    pixelSize() {
      return typeof this.size === 'number' ? `${this.size}px` : this.size;
    },
  },
};
</script>

<template>
  <svg
    class="m-icon"
    :width="pixelSize"
    :height="pixelSize"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="decorative ? 'true' : null"
    :role="decorative ? null : 'img'"
    :aria-label="decorative ? null : label || name"
    focusable="false"
  ><g v-html="glyph"></g></svg>
</template>

<style lang="scss" scoped>
.m-icon {
  display: block;
  flex-shrink: 0;
}
</style>
