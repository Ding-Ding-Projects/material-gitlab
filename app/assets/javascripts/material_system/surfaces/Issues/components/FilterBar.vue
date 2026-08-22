<template>
  <div class="gl-mds-filterbar" role="group" aria-label="Issue filters">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="gl-mds-filterbar__chip"
      :class="{ 'gl-mds-filterbar__chip--on': chip.on }"
      :aria-pressed="chip.on"
      @click="$emit('toggle-filter', chip.key)"
    >
      <mds-icon v-if="chip.on" name="check" size="sm" />
      {{ chip.label }}
    </button>
    <span class="gl-mds-filterbar__count">{{ countLabel }}</span>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'FilterBar',
  components: { MdsIcon },
  props: {
    filters: { type: Object, required: true },
    count: { type: Number, required: true },
  },
  computed: {
    chips() {
      return [
        { key: 'open', label: 'Open', on: this.filters.open },
        { key: 'closed', label: 'Closed', on: this.filters.closed },
        { key: 'mine', label: 'Assigned to me', on: this.filters.mine },
      ];
    },
    countLabel() {
      return `${this.count} issue${this.count === 1 ? '' : 's'}`;
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-filterbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gl-mds-filterbar__chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--gl-mds-outl);
  background: transparent;
  color: var(--gl-mds-onsurf);

  &--on {
    border-color: var(--gl-mds-primc);
    background: var(--gl-mds-primc);
    color: var(--gl-mds-onprimc);
  }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-filterbar__count {
  font-size: 12.5px;
  color: var(--gl-mds-onsurfv);
}
</style>
