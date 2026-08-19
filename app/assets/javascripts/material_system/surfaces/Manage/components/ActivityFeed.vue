<template>
  <div class="mg-card" data-screen-label="Activity feed">
    <MgSelectionToolbar
      v-if="events.length > 0"
      :visible-count="events.length"
      :selected-count="selectedIds.length"
      item-noun="events"
      @select-all="$emit('select-all')"
      @clear="$emit('clear-selection')"
      @invert="$emit('invert-selection')"
    >
      <button type="button" class="mg-btn mg-btn--text" @click="$emit('bulk-copy-links')">
        <MgIcon name="copy" size="small" /> Copy links
      </button>
      <button type="button" class="mg-btn mg-btn--text" @click="$emit('bulk-copy-details')">
        <MgIcon name="copy" size="small" /> Copy details
      </button>
    </MgSelectionToolbar>

    <ul class="mg-list" role="list" aria-label="Activity">
      <li v-for="ev in events" :key="ev.id" class="mg-activity-row" :class="{ 'mg-activity-row--selected': selectedIds.includes(ev.id) }">
        <label class="mg-activity-row__select">
          <input
            type="checkbox"
            :checked="selectedIds.includes(ev.id)"
            :aria-label="`Select event: ${ev.author.name} ${ev.actionName} ${ev.targetTitle}`"
            @change="$emit('toggle-select', ev.id)"
          />
        </label>
        <div class="mg-activity-row__avatar" aria-hidden="true">{{ ev.author.initials }}</div>
        <div class="mg-activity-row__body">
          <div class="mg-activity-row__line">
            <b>{{ ev.author.name }}</b> {{ ev.actionName }} <a :href="ev.targetUrl">{{ ev.targetTitle }}</a>
          </div>
          <div class="mg-activity-row__when">{{ formatRelativeTime(ev.createdAt) }}</div>
        </div>
        <MgIcon :name="ev.icon" class="mg-activity-row__icon" :class="`mg-activity-row__icon--${accentOf(ev.icon)}`" />
      </li>
    </ul>

    <div v-if="events.length === 0" class="mg-empty-state">{{ emptyMessage }}</div>
  </div>
</template>

<script>
import MgIcon from './MgIcon.vue';
import MgSelectionToolbar from './MgSelectionToolbar.vue';
import { eventIconAccent, formatRelativeTime } from '../data';

export default {
  name: 'ActivityFeed',
  components: { MgIcon, MgSelectionToolbar },
  props: {
    events: { type: Array, required: true },
    selectedIds: { type: Array, default: () => [] },
    emptyMessage: { type: String, default: 'Nothing matches.' },
  },
  methods: {
    accentOf: eventIconAccent,
    formatRelativeTime(iso) {
      return formatRelativeTime(iso);
    },
  },
};
</script>

<style lang="scss" scoped>
.mg-card {
  background: var(--mg-card);
  border-radius: var(--mg-radius-card);
  overflow: hidden;
  box-shadow: var(--mg-elevation-1);
  max-width: 920px;
}

.mg-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mg-activity-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--mg-outlv);

  &:last-child {
    border-bottom: none;
  }

  &--selected {
    background: var(--mg-surfcl);
  }
}

.mg-activity-row__select {
  display: flex;
  align-items: center;
  min-height: var(--mg-touch);

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--mg-prim);
  }

  input:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-activity-row__avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-sec);
  color: var(--mg-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.mg-activity-row__body {
  flex: 1;
  min-width: 0;
}

.mg-activity-row__line {
  font-size: 13.5px;
  overflow-wrap: anywhere;
}

.mg-activity-row__when {
  font-size: 12px;
  color: var(--mg-onsurfv);
  margin-top: 1px;
}

.mg-activity-row__icon {
  color: var(--mg-onsurfv);
  flex-shrink: 0;
}

.mg-activity-row__icon--good {
  color: var(--mg-good);
}
.mg-activity-row__icon--error {
  color: var(--mg-err);
}
.mg-activity-row__icon--primary {
  color: var(--mg-prim);
}

.mg-empty-state {
  padding: 36px;
  text-align: center;
  color: var(--mg-onsurfv);
  font-size: 13.5px;
}

.mg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--mg-radius-pill);
  padding: 6px 12px;
  font: inherit;
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  border: none;
  min-height: 32px;
}

.mg-btn--text {
  background: transparent;
  color: var(--mg-prim);

  &:hover {
    background: var(--mg-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}
</style>
