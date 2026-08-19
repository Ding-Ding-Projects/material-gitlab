<template>
  <div class="gl-mds-header">
    <h1 class="gl-mds-header__title">Issues</h1>
    <view-switcher :view="view" @update:view="$emit('update:view', $event)" />
    <button type="button" class="gl-mds-header__new" @click="$emit('open-new')">
      <mds-icon name="add" size="sm" />New issue
    </button>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';
import ViewSwitcher from './ViewSwitcher.vue';

export default {
  name: 'SurfaceHeader',
  components: { MdsIcon, ViewSwitcher },
  props: {
    view: { type: String, required: true },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
  flex-wrap: wrap;
}

.gl-mds-header__title {
  margin: 0;
  font-family: 'Google Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 24px;
  font-weight: 500;
}

.gl-mds-header__new {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--gl-mds-prim);
  color: var(--gl-mds-onprim);
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-weight: 500;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  &:hover { filter: brightness(1.05); }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-onsurf);
    outline-offset: 2px;
  }
}
</style>
