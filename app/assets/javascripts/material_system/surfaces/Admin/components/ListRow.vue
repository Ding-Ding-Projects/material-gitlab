<template>
  <div class="gl-mds-admin-row" role="row">
    <label class="gl-mds-admin-row__select">
      <material-checkbox
        :checked="selected"
        :aria-label="`Select ${row.title}`"
        @change="$emit('toggle-select')"
      />
    </label>
    <Icon :name="row.icon" :size="19" class="gl-mds-admin-row__icon" :class="`gl-mds-admin-row__icon--${row.tone}`" />
    <div class="gl-mds-admin-row__text">
      <div class="gl-mds-admin-row__title" :class="{ 'gl-mds-admin-row__title--mono': row.titleMono }">{{ row.title }}</div>
      <div class="gl-mds-admin-row__sub">{{ row.sub }}</div>
    </div>
    <span v-if="row.badge" class="gl-mds-admin-chip" :class="`gl-mds-admin-chip--${row.badge.tone}`">{{ row.badge.label }}</span>
    <span v-if="row.meta" class="gl-mds-admin-row__meta">{{ row.meta }}</span>
    <material-button
      v-if="row.actionLabel"
      type="button"
      class="gl-mds-admin-row__action"
      :class="`gl-mds-admin-row__action--${row.actionTone}`"
      @click="$emit('action', row.actionId)"
    >
      {{ row.actionLabel }}
    </material-button>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import MaterialButton from '../../../components/material_button';
import MaterialCheckbox from '../../../components/material_checkbox';

export default {
  name: 'ListRow',
  components: { Icon, MaterialButton, MaterialCheckbox },
  props: {
    row: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>
