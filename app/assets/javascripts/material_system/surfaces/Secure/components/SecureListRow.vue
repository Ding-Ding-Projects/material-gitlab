<template>
  <li class="secure-row">
    <label class="secure-visually-hidden" :for="checkboxId">{{ `Select ${row.title}` }}</label>
    <input
      :id="checkboxId"
      type="checkbox"
      class="secure-row__checkbox"
      :checked="selected"
      @change="$emit('toggle-select', row.id)"
    />
    <span class="secure-row__icon" :class="`secure-row__icon--tone-${row.tone}`">
      <secure-icon :name="row.icon" :size="19" />
    </span>
    <div class="secure-row__body">
      <div class="secure-row__title" :class="{ 'secure-row__title--mono': row.titleMonospace }">{{ row.title }}</div>
      <div class="secure-row__sub">{{ row.sub }}</div>
    </div>
    <span v-if="row.badge" class="secure-row__badge" :class="`secure-row__badge--tone-${row.badgeTone}`">
      {{ row.badge }}
    </span>
    <span v-if="row.meta" class="secure-row__meta">{{ row.meta }}</span>
    <button
      v-if="row.actionLabel"
      type="button"
      class="secure-row__action"
      :class="{ 'secure-row__action--destructive': row.actionDestructive }"
      @click="$emit('action', row)"
    >
      {{ row.actionLabel }}
    </button>
  </li>
</template>

<script>
import { uniqueId } from 'lodash';
import SecureIcon from './SecureIcon.vue';

export default {
  name: 'SecureListRow',
  components: { SecureIcon },
  props: {
    row: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  data() {
    return { checkboxId: uniqueId('secure-row-select-') };
  },
};
</script>
