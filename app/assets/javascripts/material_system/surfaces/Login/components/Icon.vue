<template>
  <svg
    class="material-login__icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" :fill="color" />
  </svg>
</template>

<script>
// Self-drawn outline glyphs so the surface never depends on a remote icon font.
const ICONS = {
  visibility: {
    paths: [
      'M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9z',
      'M12 9.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z',
    ],
  },
  visibility_off: {
    paths: [
      'M3.3 2.5 2 3.8l3.2 3.2C3.4 8.3 1.9 10 1 12c1.7 3.9 6 7 11 7 1.9 0 3.7-.4 5.3-1.2l3 3 1.3-1.3L3.3 2.5zM12 16.5a4.5 4.5 0 0 1-4.4-5.4l1.6 1.6a2.2 2.2 0 0 0 2.8 2.8l1.6 1.6c-.5.2-1 .4-1.6.4z',
      'M12 5c5 0 9.3 3.1 11 7-.6 1.4-1.6 2.7-2.7 3.7l-1.4-1.4a10 10 0 0 0 2-2.3c-1.5-2.6-4.9-5-8.9-5-1 0-2 .1-2.9.4L7.5 5.8C8.9 5.3 10.4 5 12 5z',
    ],
  },
  check: { paths: ['M9 16.2 4.8 12l-1.4 1.4L9 19 20.6 7.4l-1.4-1.4z'] },
  key: {
    paths: [
      'M7.5 14a4.5 4.5 0 1 1 4.4-5.5H21v4h-2v3h-3v-3h-3.6A4.5 4.5 0 0 1 7.5 14zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    ],
  },
  badge: {
    paths: [
      'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 8c2.2 0 4.2.9 5.5 2.3-1.4 1.5-3.4 2.4-5.5 2.4s-4.1-.9-5.5-2.4C7.8 15.9 9.8 15 12 15z',
    ],
  },
};

export default {
  name: 'LoginIcon',
  props: {
    name: { type: String, required: true, validator: (value) => Object.prototype.hasOwnProperty.call(ICONS, value) },
    size: { type: [Number, String], default: 20 },
    color: { type: String, default: 'currentColor' },
  },
  computed: {
    paths() {
      return ICONS[this.name]?.paths || [];
    },
  },
};
</script>
