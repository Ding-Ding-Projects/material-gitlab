<template>
  <div :id="`am-anchor-${block.id}`" class="am-row" :data-am-anchor="block.id" tabindex="-1">
    <label class="am-row__checkbox">
      <input
        type="checkbox"
        :checked="selected"
        :aria-label="`Select ${block.title}`"
        @change="$emit('toggle-select', block.id)"
      />
    </label>
    <MaterialIcon name="document" :size="19" class="am-row__icon" />
    <div class="am-row__body">
      <div class="am-row__title">{{ block.title }}</div>
      <div class="am-row__subtitle">{{ block.summary }}</div>
    </div>
    <span class="am-row__meta">{{ block.lines }} lines</span>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'InstructionBlockRow',
  components: { MaterialIcon },
  props: {
    block: {
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
