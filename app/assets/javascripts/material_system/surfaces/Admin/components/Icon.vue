<template>
  <svg
    class="gl-mds-admin-icon"
    :width="pixelSize"
    :height="pixelSize"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <g v-if="name === 'search'"><circle cx="10.5" cy="10.5" r="6.5" /><line x1="20" y1="20" x2="15.3" y2="15.3" /></g>
    <g v-else-if="name === 'filter'">
      <path d="M4 6h16M7 12h10M10.5 18h3" />
    </g>
    <g v-else-if="name === 'regex'">
      <rect x="3" y="15" width="8" height="6" rx="1.5" transform="rotate(-45 7 18)" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" transform="rotate(-45 17 6)" />
      <line x1="9.5" y1="14.5" x2="14.5" y2="9.5" />
    </g>
    <g v-else-if="name === 'command'">
      <rect x="5" y="5" width="4" height="4" rx="1.3" /><rect x="15" y="5" width="4" height="4" rx="1.3" />
      <rect x="5" y="15" width="4" height="4" rx="1.3" /><rect x="15" y="15" width="4" height="4" rx="1.3" />
      <line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="17" x2="15" y2="17" />
      <line x1="7" y1="9" x2="7" y2="15" /><line x1="17" y1="9" x2="17" y2="15" />
    </g>
    <g v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.85 1.85M17.55 17.55l1.85 1.85M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.85-1.85M17.55 6.45l1.85-1.85" />
    </g>
    <g v-else-if="name === 'moon'"><path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z" /></g>
    <g v-else-if="name === 'person'"><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></g>
    <g v-else-if="name === 'bot'">
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <circle cx="9.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 8V4.5" /><circle cx="12" cy="3.5" r="1" fill="currentColor" stroke="none" />
      <path d="M2.5 12v3M21.5 12v3" />
    </g>
    <g v-else-if="name === 'folder'"><path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2.4H19a1.5 1.5 0 0 1 1.5 1.5v8.6a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z" /></g>
    <g v-else-if="name === 'check-circle'"><circle cx="12" cy="12" r="8.5" /><polyline points="8,12.5 11,15.5 16,9" /></g>
    <g v-else-if="name === 'warning'"><path d="M12 4 2.5 20h19Z" /><line x1="12" y1="10.5" x2="12" y2="14.5" /><circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'error'"><circle cx="12" cy="12" r="8.5" /><line x1="12" y1="7.5" x2="12" y2="13" /><circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" /></g>
    <g v-else-if="name === 'close'"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>
    <g v-else-if="name === 'trash'">
      <path d="M5 7h14" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5L17 7" />
      <line x1="10" y1="11" x2="10" y2="16" /><line x1="14" y1="11" x2="14" y2="16" />
    </g>
    <g v-else-if="name === 'logout'"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="M15 16l4-4-4-4" /><line x1="19" y1="12" x2="9" y2="12" /></g>
    <g v-else-if="name === 'bell'"><path d="M6 10a6 6 0 0 1 12 0v4.5l1.5 2.5h-15L6 14.5Z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></g>
    <g v-else-if="name === 'admin'"><path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6Z" /><polyline points="8.8,12 11,14.3 15.4,9.6" /></g>
    <g v-else-if="name === 'chevron-down'"><polyline points="5,9 12,16 19,9" /></g>
    <g v-else><circle cx="12" cy="12" r="8.5" /></g>
  </svg>
</template>

<script>
// Self-drawn outline glyphs so the surface never depends on a remote icon font or CDN.
export default {
  name: 'AdminIcon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 20 },
  },
  computed: {
    pixelSize() {
      return typeof this.size === 'number' ? this.size : parseInt(this.size, 10) || 20;
    },
  },
};
</script>
