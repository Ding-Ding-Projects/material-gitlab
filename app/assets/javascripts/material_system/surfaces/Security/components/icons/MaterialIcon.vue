<script>
/**
 * Hand-authored inline SVG icon set. The design references Google's Material
 * Symbols webfont via a Google Fonts CDN link; this surface may not load a
 * remote font or hit a CDN, so every glyph the design uses is redrawn as a
 * small self-contained path instead.
 */
const PATHS = {
  search:
    'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.5 19l-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z',
  close: 'M18.3 5.71 12 12.01l-6.3-6.3-1.41 1.42 6.29 6.29-6.3 6.3 1.42 1.41 6.3-6.29 6.29 6.3 1.41-1.42-6.29-6.3 6.3-6.29Z',
  tune: 'M4 18h4v-2H4v2Zm0-12v2h10V6H4Zm10 14v-2h6v-2h-6v-2h-2v6h2ZM8 10v2H4v2h4v2h2v-6H8Zm12 4v-2H10v2h10Zm-6-4h2V8h4V6h-4V4h-2v6Z',
  command:
    'M7 4a3 3 0 0 0 0 6h1v4H7a3 3 0 1 0 3 3v-1h4v1a3 3 0 1 0 3-3h-1v-4h1a3 3 0 1 0-3-3v1H10V7a3 3 0 0 0-3-3Zm0 2a1 1 0 0 1 1 1v1H7a1 1 0 1 1 0-2Zm10 0a1 1 0 1 1 0 2h-1V7a1 1 0 0 1 1-1ZM10 10h4v4h-4v-4ZM7 16h1v1a1 1 0 1 1-1-1Zm10 0a1 1 0 1 1-1 1v-1h1Z',
  darkMode:
    'M12 3a9 9 0 1 0 9 9.79A7 7 0 0 1 12 3Zm0 16a7 7 0 0 1-1.03-13.93A9 9 0 0 0 19.93 13 7 7 0 0 1 12 19Z',
  lightMode:
    'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM11 1h2v3h-2V1Zm0 19h2v3h-2v-3ZM3.51 4.93l1.42-1.42L7.05 5.63 5.63 7.05 3.51 4.93Zm13.02 13.02 1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12ZM1 11h3v2H1v-2Zm19 0h3v2h-3v-2ZM3.51 19.07l2.12-2.12 1.42 1.42-2.12 2.12-1.42-1.42Zm13.02-13.02 2.12-2.12 1.42 1.42-2.12 2.12-1.42-1.42Z',
  addTask:
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h9v-2H6V4h7v5h5v2h2V8l-6-6Zm3 12v3h-3v2h3v3h2v-3h3v-2h-3v-3h-2Z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z',
  chevronDown: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6Z',
  filterOff:
    'M2.39 1.73 1.11 3l7.14 7.14V15l3.5 3.5v-5.65l6.62-8.35A1 1 0 0 0 17.5 3H4.83l-1.32-1.32-1.12 1.05Zm18.9 18.9L19.86 22l-4.75-4.75-2.36 2.98v-2.3l-1.5-1.5v.01l-9-9L1.11 6l19.6 19.6-1.42-1.42-.02.02L21.29 20.6Z',
  addCircle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h4v2h-4v4h-2v-4H7v-2h4V7h2v6Z',
  download: 'M5 20h14v-2H5v2Zm14-9h-4V3H9v8H5l7 7 7-7Z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z',
  checkboxIndeterminate: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-2 10H7v-2h10v2Z',
};

export default {
  name: 'MaterialIcon',
  props: {
    name: {
      type: String,
      required: true,
      validator: (value) => Object.keys(PATHS).includes(value),
    },
    size: {
      type: [Number, String],
      required: false,
      default: 20,
    },
  },
  computed: {
    path() {
      return PATHS[this.name];
    },
  },
};
</script>

<template>
  <svg
    class="sec-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" fill="currentColor" />
  </svg>
</template>
