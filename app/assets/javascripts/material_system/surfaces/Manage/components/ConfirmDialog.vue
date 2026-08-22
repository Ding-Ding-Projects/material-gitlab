<template>
  <div class="mg-scrim" @mousedown.self="cancel">
    <div
      ref="dialog"
      class="mg-confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
      @keydown.esc="cancel"
    >
      <h2 :id="titleId" class="mg-confirm__title">{{ title }}</h2>
      <p :id="descId" class="mg-confirm__desc">{{ description }}</p>
      <ul v-if="items.length > 1" class="mg-confirm__items">
        <li v-for="item in items" :key="item">{{ item }}</li>
      </ul>
      <div class="mg-confirm__actions">
        <button ref="cancelBtn" type="button" class="mg-btn mg-btn--text" @click="cancel">Cancel</button>
        <button type="button" class="mg-btn mg-btn--danger" @click="confirm">{{ confirmLabel }}</button>
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
    return { titleId: `mg-confirm-title-${uid}`, descId: `mg-confirm-desc-${uid}` };
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
.mg-scrim {
  position: fixed;
  inset: 0;
  background: var(--mg-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.mg-confirm {
  background: var(--mg-card);
  color: var(--mg-onsurf);
  border-radius: 24px;
  padding: 24px;
  max-width: 420px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--mg-elevation-3);
}

.mg-confirm__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
}

.mg-confirm__desc {
  margin: 0 0 8px;
  font-size: 13.5px;
  color: var(--mg-onsurfv);
}

.mg-confirm__items {
  margin: 0 0 16px;
  padding-left: 20px;
  font-size: 13px;
  color: var(--mg-onsurfv);
  max-height: 160px;
  overflow-y: auto;
}

.mg-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.mg-btn {
  border-radius: var(--mg-radius-pill);
  padding: 9px 18px;
  font: inherit;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  border: none;

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-btn--text {
  background: transparent;
  color: var(--mg-onsurfv);

  &:hover {
    background: var(--mg-surfch);
  }
}

.mg-btn--danger {
  background: var(--mg-err);
  color: var(--mg-errc);

  &:hover {
    filter: brightness(1.06);
  }
}
</style>
