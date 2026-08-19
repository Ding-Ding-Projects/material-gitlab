<template>
  <div class="gl-mds-drawer-layer">
    <div class="gl-mds-drawer-scrim" @click="$emit('close')"></div>
    <aside
      ref="panel"
      class="gl-mds-drawer"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
    >
      <div class="gl-mds-drawer__top">
        <span class="gl-mds-drawer__iid">#{{ issue.iid }}</span>
        <span class="gl-mds-drawer__state" :class="`gl-mds-drawer__state--${issue.state.toLowerCase()}`">{{ issue.state }}</span>
        <button type="button" class="gl-mds-drawer__close" aria-label="Close issue details" @click="$emit('close')">
          <mds-icon name="close" />
        </button>
      </div>

      <h2 :id="titleId" class="gl-mds-drawer__title">{{ issue.title }}</h2>
      <p class="gl-mds-drawer__body">{{ issue.body || 'No description provided.' }}</p>

      <section class="gl-mds-drawer__section">
        <h3 class="gl-mds-drawer__label">Labels</h3>
        <div class="gl-mds-drawer__chips">
          <button
            v-for="label in allLabels"
            :key="label.name"
            type="button"
            class="gl-mds-drawer__label-chip"
            :class="{ 'gl-mds-drawer__label-chip--on': label.on }"
            :style="label.on ? { background: label.bg, color: label.fg, borderColor: label.bg } : null"
            :aria-pressed="label.on"
            @click="$emit('toggle-label', label.name)"
          >
            {{ label.name }}
          </button>
        </div>
      </section>

      <section class="gl-mds-drawer__section">
        <h3 class="gl-mds-drawer__label">Assignee</h3>
        <div class="gl-mds-drawer__chips">
          <button
            v-for="person in assignees"
            :key="person.name"
            type="button"
            class="gl-mds-drawer__assignee-chip"
            :class="{ 'gl-mds-drawer__assignee-chip--on': person.on }"
            :aria-pressed="person.on"
            @click="$emit('pick-assignee', person.name)"
          >
            <span class="gl-mds-drawer__assignee-avatar">{{ person.avatar }}</span>{{ person.name }}
          </button>
        </div>
      </section>

      <button type="button" class="gl-mds-drawer__toggle-state" @click="$emit('toggle-state')">
        {{ issue.state === 'Open' ? 'Close issue' : 'Reopen issue' }}
      </button>
    </aside>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'IssueDrawer',
  components: { MdsIcon },
  props: {
    issue: { type: Object, required: true },
    allLabels: { type: Array, required: true },
    assignees: { type: Array, required: true },
  },
  computed: {
    titleId() {
      return `gl-mds-drawer-title-${this.issue.id}`;
    },
  },
  mounted() {
    this.$refs.panel.focus();
  },
};
</script>

<style scoped lang="scss">
.gl-mds-drawer-scrim {
  position: fixed;
  inset: 0;
  background: var(--gl-mds-scrim);
  z-index: 40;
}

.gl-mds-drawer {
  position: fixed;
  top: 12px;
  right: 12px;
  bottom: 12px;
  width: min(420px, calc(100vw - 24px));
  background: var(--gl-mds-surf);
  border-radius: 24px;
  z-index: 41;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: -2px;
  }
}

.gl-mds-drawer__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gl-mds-drawer__iid {
  font-size: 12.5px;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-drawer__state {
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--gl-mds-surfch);
  color: var(--gl-mds-onsurfv);

  &--open {
    background: var(--gl-mds-goodc);
    color: var(--gl-mds-good);
  }
}

.gl-mds-drawer__close {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--gl-mds-onsurf);
  cursor: pointer;

  &:hover { background: var(--gl-mds-surfch); }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-drawer__title {
  margin: 0;
  font-family: 'Google Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 19px;
  font-weight: 500;
  line-height: 1.35;
}

.gl-mds-drawer__body {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-drawer__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gl-mds-drawer__label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--gl-mds-onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gl-mds-drawer__chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.gl-mds-drawer__label-chip {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 13px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid var(--gl-mds-outl);
  background: transparent;
  color: var(--gl-mds-onsurfv);
  font-family: inherit;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-drawer__assignee-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  padding: 5px 13px 5px 6px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid var(--gl-mds-outl);
  background: transparent;
  color: var(--gl-mds-onsurfv);
  font-family: inherit;

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

.gl-mds-drawer__assignee-avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--gl-mds-sec);
  color: var(--gl-mds-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  font-weight: 700;
}

.gl-mds-drawer__toggle-state {
  margin-top: auto;
  align-self: flex-start;
  padding: 10px 22px;
  border-radius: 999px;
  font-weight: 500;
  font-size: 13.5px;
  cursor: pointer;
  border: 1px solid var(--gl-mds-outl);
  color: var(--gl-mds-onprimc);
  background: none;
  font-family: inherit;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}
</style>
