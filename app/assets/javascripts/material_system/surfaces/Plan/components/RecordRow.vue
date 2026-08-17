<template>
  <div class="gl-mds-plan__row" role="listitem">
    <select-checkbox :checked="selected" :label="`Select ${row.title}`" @change="$emit('toggle-select', row.id)" />
    <mds-icon :name="row.icon" :style="{ color: row.iconColor }" />
    <div class="gl-mds-plan__row-text">
      <div class="gl-mds-plan__row-title">{{ row.title }}</div>
      <div class="gl-mds-plan__row-sub">{{ row.sub }}</div>
    </div>
    <div v-if="row.pct" class="gl-mds-plan__row-progress">
      <div class="gl-mds-plan__progress-track">
        <div class="gl-mds-plan__progress-fill" :style="{ width: row.pct }"></div>
      </div>
      <span class="gl-mds-plan__row-pct">{{ row.pct }}</span>
    </div>
    <span v-if="row.badge" class="gl-mds-plan__badge" :style="{ background: row.badgeBg, color: row.badgeFg }">{{ row.badge }}</span>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';
import SelectCheckbox from './SelectCheckbox.vue';

export default {
  name: 'RecordRow',
  components: { MdsIcon, SelectCheckbox },
  props: {
    row: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 16px 8px 12px;
  border-bottom: 1px solid var(--gl-mds-outlv);
}

.gl-mds-plan__row-text {
  flex: 1;
  min-width: 0;
}

.gl-mds-plan__row-title {
  font-weight: 500;
  font-size: 13.5px;
}

.gl-mds-plan__row-sub {
  font-size: 12px;
  color: var(--gl-mds-onsurfv);
  margin-top: 1px;
}

.gl-mds-plan__row-progress {
  width: 130px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.gl-mds-plan__progress-track {
  height: 6px;
  border-radius: 999px;
  background: var(--gl-mds-surfch);
  overflow: hidden;
}

.gl-mds-plan__progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--gl-mds-prim);
}

.gl-mds-plan__row-pct {
  font-size: 11px;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-plan__badge {
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 999px;
  text-transform: capitalize;
  flex-shrink: 0;
}
</style>
