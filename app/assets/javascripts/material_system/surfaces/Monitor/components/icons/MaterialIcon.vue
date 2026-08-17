<script>
/**
 * Hand-authored inline SVG icon set. The design references Google's Material
 * Symbols webfont via a Google Fonts CDN link; this surface may not load a
 * remote font or hit a CDN, so every glyph the design uses is redrawn as a
 * small self-contained path instead. Rendered with fill-rule="evenodd" so a
 * shape nested inside another (an exclamation cut into a circle, a screen cut
 * into a monitor body) reads as a hole regardless of the winding direction it
 * was authored in.
 */
const PATHS = {
  search:
    'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.5 19l-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z',
  close:
    'M18.3 5.71 12 12.01l-6.3-6.3-1.41 1.42 6.29 6.29-6.3 6.3 1.42 1.41 6.3-6.29 6.29 6.3 1.41-1.42-6.29-6.3 6.3-6.29Z',
  construction:
    'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.7 4.7C.6 7.1 1 10.1 3 12.1c1.9 1.9 4.9 2.3 7.3 1.2l9.1 9.1c.4.4 1 .4 1.4 0l1.9-1.9c.4-.4.4-1 0-1.4Z',
  command:
    'M7 4a3 3 0 0 0 0 6h1v4H7a3 3 0 1 0 3 3v-1h4v1a3 3 0 1 0 3-3h-1v-4h1a3 3 0 1 0-3-3v1H10V7a3 3 0 0 0-3-3Zm0 2a1 1 0 0 1 1 1v1H7a1 1 0 1 1 0-2Zm10 0a1 1 0 1 1 0 2h-1V7a1 1 0 0 1 1-1ZM10 10h4v4h-4v-4ZM7 16h1v1a1 1 0 1 1-1-1Zm10 0a1 1 0 1 1-1 1v-1h1Z',
  darkMode: 'M12 3a9 9 0 1 0 9 9.79A7 7 0 0 1 12 3Zm0 16a7 7 0 0 1-1.03-13.93A9 9 0 0 0 19.93 13 7 7 0 0 1 12 19Z',
  lightMode:
    'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM11 1h2v3h-2V1Zm0 19h2v3h-2v-3ZM3.51 4.93l1.42-1.42L7.05 5.63 5.63 7.05 3.51 4.93Zm13.02 13.02 1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12ZM1 11h3v2H1v-2Zm19 0h3v2h-3v-2ZM3.51 19.07l2.12-2.12 1.42 1.42-2.12 2.12-1.42-1.42Zm13.02-13.02 2.12-2.12 1.42 1.42-2.12 2.12-1.42-1.42Z',
  emergency: 'M7 2H17L22 7V17L17 22H7L2 17V7ZM11 6H13V14H11ZM11 16H13V18H11Z',
  notificationImportant:
    'M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22ZM19 15.6V11a7 7 0 0 0-5.6-6.86V3a1.4 1.4 0 1 0-2.8 0v1.14A7 7 0 0 0 5 11v4.6L3 17.6V19h18v-1.4Z',
  error: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z',
  phoneInTalk:
    'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.58 1 1 0 0 1-.25 1.01l-2.2 2.2Z',
  supportAgent:
    'M12 3a8 8 0 0 0-8 8v7a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H6v-1a6 6 0 0 1 12 0v1h-1a1 1 0 0 0-1 1v6.5a1.5 1.5 0 0 1-1.5 1.5H12v2h2.5a3.5 3.5 0 0 0 3.5-3.5V19h1a2 2 0 0 0 2-2v-7a8 8 0 0 0-8-8Z',
  monitoring:
    'M3 4H21A1 1 0 0 1 22 5V16A1 1 0 0 1 21 17H14L15 20H17V22H7V20H9L10 17H3A1 1 0 0 1 2 16V5A1 1 0 0 1 3 4Z M5 6H19V15H5Z',
  download: 'M5 20h14v-2H5v2Zm14-9h-4V3H9v8H5l7 7 7-7Z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z',
  addCircle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h4v2h-4v4h-2v-4H7v-2h4V7h2v6Z',
  warning: 'M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z',
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
  <svg class="mon-icon" :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path :d="path" fill="currentColor" fill-rule="evenodd" />
  </svg>
</template>
