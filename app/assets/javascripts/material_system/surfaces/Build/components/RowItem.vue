<template>
  <li class="row-item">
    <label class="row-item__select">
      <material-checkbox
        :checked="selected"
        :aria-label="`Select ${row.title}`"
        @change="$emit('toggle')"
      ></material-checkbox>
    </label>
    <icon :name="row.icon" class="row-item__icon" :style="{ color: row.iconColor }" />
    <div class="row-item__main">
      <div class="row-item__title" :class="{ 'row-item__title--mono': row.mono }">{{ row.title }}</div>
      <div class="row-item__sub">{{ row.sub }}</div>
    </div>
    <status-badge v-if="row.badge" v-bind="row.badge" />
    <span class="row-item__meta">{{ row.metaText }}</span>
    <material-button
      v-if="row.action"
      type="button"
      variant="text"
      class="row-item__action"
      :style="{ color: row.action.color }"
      @click="row.action.run"
    >{{ row.action.label }}</material-button>
  </li>
</template>

<script>
import Icon from './Icon.vue';
import StatusBadge from './StatusBadge.vue';
import MaterialButton from '../../../components/material_button';
import MaterialCheckbox from '../../../components/material_checkbox';

export default {
  name: 'BuildRowItem',
  components: { Icon, StatusBadge, MaterialButton, MaterialCheckbox },
  props: {
    row: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>
