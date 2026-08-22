<template>
  <div class="mg-page-header">
    <h1 class="mg-page-header__title">Manage</h1>
    <div class="mg-tabs" role="tablist" aria-label="Manage sections">
      <button
        v-for="tab in tabs"
        :id="`mg-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="mg-tabs__tab"
        :class="{ 'mg-tabs__tab--active': tab.id === activeTab }"
        :aria-selected="tab.id === activeTab"
        :aria-controls="`mg-panel-${tab.id}`"
        :tabindex="tab.id === activeTab ? 0 : -1"
        @click="$emit('select-tab', tab.id)"
        @keydown.left="focusAdjacent(-1)"
        @keydown.right="focusAdjacent(1)"
      >
        {{ tab.label }}
      </button>
    </div>
    <a class="mg-page-header__members" :href="membersHref">
      Members
      <MgIcon name="external" size="small" />
    </a>
  </div>
</template>

<script>
import MgIcon from './MgIcon.vue';

export default {
  name: 'ManagePageHeader',
  components: { MgIcon },
  props: {
    tabs: { type: Array, required: true },
    activeTab: { type: String, required: true },
    membersHref: { type: String, required: true },
  },
  methods: {
    focusAdjacent(direction) {
      const ids = this.tabs.map((tab) => tab.id);
      const currentIndex = ids.indexOf(this.activeTab);
      const nextIndex = (currentIndex + direction + ids.length) % ids.length;
      this.$emit('select-tab', ids[nextIndex]);
      this.$nextTick(() => {
        const buttons = this.$el.querySelectorAll('.mg-tabs__tab');
        buttons[nextIndex] && buttons[nextIndex].focus();
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.mg-page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
}

.mg-page-header__title {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.mg-tabs {
  display: flex;
  background: var(--mg-surfc);
  border-radius: var(--mg-radius-pill);
  padding: 3px;
  gap: 2px;
}

.mg-tabs__tab {
  padding: 7px 18px;
  border-radius: var(--mg-radius-pill);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--mg-onsurfv);
  font-family: inherit;

  &--active {
    background: var(--mg-primc);
    color: var(--mg-onprimc);
  }

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-page-header__members {
  margin-left: auto;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  padding: 4px 6px;

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}
</style>
