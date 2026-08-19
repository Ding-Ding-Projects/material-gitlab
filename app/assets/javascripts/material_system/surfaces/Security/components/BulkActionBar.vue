<script>
import MaterialIcon from './icons/MaterialIcon.vue';

/** Appears once at least one vulnerability is selected; every action states its exact count. */
export default {
  name: 'BulkActionBar',
  components: { MaterialIcon },
  props: {
    selectedCount: {
      type: Number,
      required: true,
    },
  },
};
</script>

<template>
  <div class="sec-bulk-bar" role="toolbar" :aria-label="`${selectedCount} vulnerabilities selected`">
    <span class="sec-bulk-bar__count">{{ selectedCount }} selected</span>
    <span class="sec-bulk-bar__divider" aria-hidden="true"></span>
    <button type="button" class="sec-bulk-bar__action" @click="$emit('set-status', 'Confirmed')">
      Mark confirmed
    </button>
    <button type="button" class="sec-bulk-bar__action" @click="$emit('set-status', 'Dismissed')">Dismiss</button>
    <button type="button" class="sec-bulk-bar__action" @click="$emit('set-status', 'Resolved')">Resolve</button>
    <button type="button" class="sec-bulk-bar__action" @click="$emit('export')">
      <material-icon name="download" :size="16" />
      Export selected
    </button>
    <button type="button" class="sec-bulk-bar__clear" @click="$emit('clear')">Clear selection</button>
  </div>
</template>
