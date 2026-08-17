<template>
  <svg
    class="secure-icon"
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
    <template v-for="(element, index) in paths[name] || paths.default">
      <circle v-if="element.tag === 'circle'" :key="index" v-bind="element.attrs" />
      <line v-else-if="element.tag === 'line'" :key="index" v-bind="element.attrs" />
      <path v-else-if="element.tag === 'path'" :key="index" v-bind="element.attrs" />
      <polyline v-else-if="element.tag === 'polyline'" :key="index" v-bind="element.attrs" />
    </template>
  </svg>
</template>

<script>
// Self-hosted, dependency-free line icons. No CDN, no remote font — every
// glyph the Secure surface needs is drawn inline as plain SVG primitives.
const paths = {
  search: [{ tag: 'circle', attrs: { cx: 11, cy: 11, r: 7 } }, { tag: 'line', attrs: { x1: 21, y1: 21, x2: 16.65, y2: 16.65 } }],
  close: [
    { tag: 'line', attrs: { x1: 6, y1: 6, x2: 18, y2: 18 } },
    { tag: 'line', attrs: { x1: 6, y1: 18, x2: 18, y2: 6 } },
  ],
  'chevron-right': [{ tag: 'polyline', attrs: { points: '9 6 15 12 9 18' } }],
  'check-circle': [
    { tag: 'path', attrs: { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' } },
    { tag: 'polyline', attrs: { points: '22 4 12 14.01 9 11.01' } },
  ],
  'alert-triangle': [
    { tag: 'path', attrs: { d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z' } },
    { tag: 'line', attrs: { x1: 12, y1: 9, x2: 12, y2: 13 } },
    { tag: 'line', attrs: { x1: 12, y1: 17, x2: 12.01, y2: 17 } },
  ],
  info: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: 'line', attrs: { x1: 12, y1: 16, x2: 12, y2: 12 } },
    { tag: 'line', attrs: { x1: 12, y1: 8, x2: 12.01, y2: 8 } },
  ],
  sun: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 5 } },
    { tag: 'line', attrs: { x1: 12, y1: 1, x2: 12, y2: 3 } },
    { tag: 'line', attrs: { x1: 12, y1: 21, x2: 12, y2: 23 } },
    { tag: 'line', attrs: { x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 } },
    { tag: 'line', attrs: { x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 } },
    { tag: 'line', attrs: { x1: 1, y1: 12, x2: 3, y2: 12 } },
    { tag: 'line', attrs: { x1: 21, y1: 12, x2: 23, y2: 12 } },
    { tag: 'line', attrs: { x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 } },
    { tag: 'line', attrs: { x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 } },
  ],
  moon: [{ tag: 'path', attrs: { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z' } }],
  refresh: [
    { tag: 'polyline', attrs: { points: '23 4 23 10 17 10' } },
    { tag: 'polyline', attrs: { points: '1 20 1 14 7 14' } },
    { tag: 'path', attrs: { d: 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' } },
  ],
  tune: [
    { tag: 'line', attrs: { x1: 4, y1: 21, x2: 4, y2: 14 } },
    { tag: 'line', attrs: { x1: 4, y1: 10, x2: 4, y2: 3 } },
    { tag: 'line', attrs: { x1: 12, y1: 21, x2: 12, y2: 12 } },
    { tag: 'line', attrs: { x1: 12, y1: 8, x2: 12, y2: 3 } },
    { tag: 'line', attrs: { x1: 20, y1: 21, x2: 20, y2: 16 } },
    { tag: 'line', attrs: { x1: 20, y1: 12, x2: 20, y2: 3 } },
    { tag: 'line', attrs: { x1: 1, y1: 14, x2: 7, y2: 14 } },
    { tag: 'line', attrs: { x1: 9, y1: 8, x2: 15, y2: 8 } },
    { tag: 'line', attrs: { x1: 17, y1: 16, x2: 23, y2: 16 } },
  ],
  command: [
    {
      tag: 'path',
      attrs: { d: 'M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0-3 3V6a3 3 0 1 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3Z' },
    },
  ],
  'git-branch': [
    { tag: 'line', attrs: { x1: 6, y1: 3, x2: 6, y2: 15 } },
    { tag: 'circle', attrs: { cx: 18, cy: 6, r: 3 } },
    { tag: 'circle', attrs: { cx: 6, cy: 18, r: 3 } },
    { tag: 'path', attrs: { d: 'M18 9a9 9 0 0 1-9 9' } },
  ],
  receipt: [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: 8, y1: 13, x2: 16, y2: 13 } },
    { tag: 'line', attrs: { x1: 8, y1: 17, x2: 16, y2: 17 } },
  ],
  shield: [{ tag: 'path', attrs: { d: 'M12 2 3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6Z' } }],
  radar: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 9 } },
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 5 } },
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 1 } },
  ],
  default: [{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 9 } }],
};

export default {
  name: 'SecureIcon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 20 },
  },
  computed: {
    paths() {
      return paths;
    },
  },
};
</script>
