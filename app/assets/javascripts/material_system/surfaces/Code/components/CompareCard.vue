<template>
  <div class="gl-code-card gl-code-compare">
    <div class="gl-code-compare__row">
      <label class="gl-code-visually-hidden" for="gl-code-compare-from">Compare from</label>
      <select
        id="gl-code-compare-from"
        class="gl-code-select"
        :value="fromRef"
        @change="$emit('update:from-ref', $event.target.value)"
      >
        <option v-for="ref in refs" :key="`from-${ref}`" :value="ref">{{ ref }}</option>
      </select>
      <material-icon name="arrow_forward" :size="20" />
      <label class="gl-code-visually-hidden" for="gl-code-compare-to">Compare to</label>
      <select
        id="gl-code-compare-to"
        class="gl-code-select"
        :value="toRef"
        @change="$emit('update:to-ref', $event.target.value)"
      >
        <option v-for="ref in refs" :key="`to-${ref}`" :value="ref">{{ ref }}</option>
      </select>
      <button type="button" class="gl-code-btn" @click="$emit('compare')">Compare</button>
    </div>
    <div v-if="result" class="gl-code-compare__result" role="status">{{ result }}</div>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'CompareCard',
  components: { MaterialIcon },
  props: {
    refs: { type: Array, required: true },
    fromRef: { type: String, required: true },
    toRef: { type: String, required: true },
    result: { type: String, default: null },
  },
};
</script>

<style lang="scss" scoped>
.gl-code-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
