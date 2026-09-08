<template>
  <div class="gl-mds-header">
    <h1 class="gl-mds-header__title">Issues</h1>
    <material-button variant="outlined" v-if="boardPath" :href="boardPath">Open project board</material-button>
    <view-switcher v-else :view="view" @update:view="$emit('update:view', $event)" />
    <material-button v-if="canCreate && newIssuePath" :href="newIssuePath" variant="filled">New issue</material-button>
    <material-button variant="filled" v-else-if="canCreate" type="button" class="gl-mds-header__new" @click="$emit('open-new')">
      <mds-icon name="add" size="sm" />New issue
    </material-button>
  </div>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';

import MdsIcon from './MdsIcon.vue';
import ViewSwitcher from './ViewSwitcher.vue';

export default {
  name: 'SurfaceHeader',
  components: { MaterialButton, MdsIcon, ViewSwitcher },
  props: {
    view: { type: String, required: true },
    canCreate: { type: Boolean, default: true },
    newIssuePath: { type: String, default: '' },
    boardPath: { type: String, default: '' },
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
