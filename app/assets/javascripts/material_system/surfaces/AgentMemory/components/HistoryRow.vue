<template>
  <div :id="`am-anchor-${entry.id}`" class="am-row" :data-am-anchor="entry.id" tabindex="-1">
    <label class="am-row__checkbox">
      <input
        type="checkbox"
        :checked="selected"
        :aria-label="`Select revision ${entry.id}`"
        @change="$emit('toggle-select', entry.id)"
      />
    </label>
    <MaterialIcon :name="entry.icon" :size="19" class="am-row__icon" />
    <div class="am-row__body">
      <div class="am-row__title">{{ entry.title }}</div>
      <div class="am-row__subtitle"><span class="am-row__rev">{{ entry.id }}</span> · {{ entry.when }}</div>
    </div>
    <button type="button" class="am-btn am-btn--outline am-btn--small" @click="$emit('restore', entry)">
      Restore as new revision
    </button>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'HistoryRow',
  components: { MaterialIcon },
  props: {
    entry: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
