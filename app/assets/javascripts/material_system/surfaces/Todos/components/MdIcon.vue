<script>
import { ICON_PATHS, FALLBACK_ICON_PATH } from '../icon-paths';

/**
 * Local inline-SVG icon renderer. Replaces the design's Material Symbols
 * Outlined webfont (a Google Fonts CDN dependency) with bundled markup so the
 * surface never fetches a remote font. Always decorative — pair it with a
 * visible text label or an aria-label on the interactive parent.
 */
export default {
  name: 'MdIcon',
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
    markup() {
      return ICON_PATHS[this.name] || FALLBACK_ICON_PATH;
    },
  },
};
</script>

<template>
  <svg
    class="md-todos__icon"
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
    v-html="markup"
  ></svg>
</template>
