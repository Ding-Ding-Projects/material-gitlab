<template>
  <li class="gl-mds-issue-row" :class="{ 'gl-mds-issue-row--selected': selected }">
    <label class="gl-mds-issue-row__select">
      <input
        type="checkbox"
        :checked="selected"
        :aria-label="`Select issue #${issue.iid}, ${issue.title}`"
        @change="$emit('toggle-select', issue.id)"
      />
    </label>
    <button type="button" class="gl-mds-issue-row__open" @click="$emit('open', issue.id)">
      <mds-icon :name="issue.state === 'Open' ? 'open-state' : 'check-circle'" :style="{ color: issue.stateColor }" />
      <span class="gl-mds-issue-row__text">
        <span class="gl-mds-issue-row__title">{{ issue.title }}</span>
        <span class="gl-mds-issue-row__meta">#{{ issue.iid }} · {{ issue.meta }}</span>
      </span>
    </button>
    <div class="gl-mds-issue-row__labels">
      <label-chip v-for="label in issue.labels" :key="label" :label="label" />
    </div>
    <div class="gl-mds-issue-row__avatar" :title="issue.assignee">{{ issue.avatar }}</div>
  </li>
</template>

<script>
import MdsIcon from './MdsIcon.vue';
import LabelChip from './LabelChip.vue';

export default {
  name: 'IssueRow',
  components: { MdsIcon, LabelChip },
  props: {
    issue: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-issue-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--gl-mds-outlv);
  list-style: none;

  &:last-child { border-bottom: none; }
  &--selected { background: var(--gl-mds-surfcl); }
  &:hover { background: var(--gl-mds-surfcl); }
}

.gl-mds-issue-row__select {
  display: flex;
  align-items: center;
  padding: 6px;
}

.gl-mds-issue-row__open {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 7px 0;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
    border-radius: 8px;
  }
}

.gl-mds-issue-row__text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.gl-mds-issue-row__title {
  font-weight: 500;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gl-mds-issue-row__meta {
  font-size: 12.5px;
  color: var(--gl-mds-onsurfv);
  margin-top: 2px;
}

.gl-mds-issue-row__labels {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.gl-mds-issue-row__avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--gl-mds-sec);
  color: var(--gl-mds-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
</style>
