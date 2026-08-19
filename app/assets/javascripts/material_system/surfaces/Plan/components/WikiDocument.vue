<template>
  <div class="gl-mds-plan__wikidoc">
    <div class="gl-mds-plan__wikidoc-head">
      <h2 class="gl-mds-plan__wikidoc-title">{{ page.title }}</h2>
      <button type="button" class="gl-mds-plan__wikidoc-edit" @click="$emit('toggle-edit')">
        <mds-icon :name="editing ? 'check' : 'edit'" size="sm" />{{ editing ? 'Save' : 'Edit' }}
      </button>
    </div>
    <textarea
      v-if="editing"
      class="gl-mds-plan__wikidoc-textarea"
      rows="10"
      :value="page.body"
      @input="$emit('update-body', $event.target.value)"
    ></textarea>
    <div v-else class="gl-mds-plan__wikidoc-body">{{ page.body }}</div>
    <div class="gl-mds-plan__wikidoc-meta">{{ page.meta }}</div>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'WikiDocument',
  components: { MdsIcon },
  props: {
    page: { type: Object, required: true },
    editing: { type: Boolean, default: false },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__wikidoc {
  background: var(--gl-mds-card);
  border-radius: 20px;
  padding: 22px 26px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.gl-mds-plan__wikidoc-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gl-mds-plan__wikidoc-title {
  margin: 0;
  font-family: 'Google Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 19px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
}

.gl-mds-plan__wikidoc-edit {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--gl-mds-outl);
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  color: var(--gl-mds-onprimc);
  background: transparent;
  font: inherit;
  flex-shrink: 0;

  &:hover { background: var(--gl-mds-surfch); }
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
}

.gl-mds-plan__wikidoc-textarea {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.7;
  background: transparent;
  color: var(--gl-mds-onsurf);
  outline: none;
  resize: vertical;

  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 1px; }
}

.gl-mds-plan__wikidoc-body {
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--gl-mds-onsurfv);
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.gl-mds-plan__wikidoc-meta {
  font-size: 11.5px;
  color: var(--gl-mds-onsurfv);
  border-top: 1px solid var(--gl-mds-outlv);
  padding-top: 10px;
}
</style>
