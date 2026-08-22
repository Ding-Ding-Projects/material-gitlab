<template>
  <div class="st-scrim" @mousedown.self="cancel">
    <div
      ref="dialog"
      class="st-confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
      @keydown.esc="cancel"
    >
      <h2 :id="titleId" class="st-confirm__title">{{ title }}</h2>
      <p :id="descId" class="st-confirm__desc">{{ description }}</p>
      <ul v-if="items.length > 1" class="st-confirm__items">
        <li v-for="item in items" :key="item">{{ item }}</li>
      </ul>
      <div class="st-confirm__actions">
        <button ref="cancelBtn" type="button" class="st-btn st-btn--text" @click="cancel">Cancel</button>
        <button type="button" class="st-btn st-btn--danger" @click="confirm">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script>
let uid = 0;

export default {
  name: 'ConfirmDialog',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    confirmLabel: { type: String, default: 'Delete' },
  },
  data() {
    uid += 1;
    return { titleId: `st-confirm-title-${uid}`, descId: `st-confirm-desc-${uid}` };
  },
  mounted() {
    this._previouslyFocused = document.activeElement;
    this.$nextTick(() => this.$refs.cancelBtn && this.$refs.cancelBtn.focus());
    document.addEventListener('keydown', this.trapTab, true);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.trapTab, true);
    if (this._previouslyFocused && this._previouslyFocused.focus) this._previouslyFocused.focus();
  },
  methods: {
    confirm() {
      this.$emit('confirm');
    },
    cancel() {
      this.$emit('cancel');
    },
    trapTab(event) {
      if (event.key !== 'Tab' || !this.$refs.dialog) return;
      const focusable = this.$refs.dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.st-scrim {
  position: fixed;
  inset: 0;
  background: var(--st-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.st-confirm {
  background: var(--st-card);
  color: var(--st-onsurf);
  border-radius: 24px;
  padding: 24px;
  max-width: 420px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--st-elevation-3);
}

.st-confirm__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
}

.st-confirm__desc {
  margin: 0 0 8px;
  font-size: 13.5px;
  color: var(--st-onsurfv);
}

.st-confirm__items {
  margin: 0 0 16px;
  padding-left: 20px;
  font-size: 13px;
  color: var(--st-onsurfv);
  max-height: 160px;
  overflow-y: auto;
}

.st-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
