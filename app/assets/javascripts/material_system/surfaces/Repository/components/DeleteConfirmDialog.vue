<script>
import MIcon from './MIcon.vue';

export default {
  name: 'DeleteConfirmDialog',
  components: { MIcon },
  props: {
    items: {
      type: Array,
      required: true,
    },
    scopeLabel: { type: String, required: true },
  },
  mounted() {
    // Default focus lands on Cancel, not Delete, so a stray Enter never confirms.
    this.$nextTick(() => this.$refs.cancelButton && this.$refs.cancelButton.focus());
  },
  methods: {
    cancel() {
      this.$emit('cancel');
    },
    confirm() {
      this.$emit('confirm');
    },
    stop(event) {
      event.stopPropagation();
    },
  },
};
</script>

<template>
  <div class="confirm-scrim" role="presentation" @click="cancel">
    <div
      class="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      aria-describedby="delete-confirm-desc"
      @click="stop"
      @keydown.esc="cancel"
    >
      <div class="confirm-dialog__head">
        <m-icon name="warning" :size="22" decorative class="confirm-dialog__icon" />
        <h2 id="delete-confirm-title" class="confirm-dialog__title">Delete {{ items.length }} item{{ items.length === 1 ? '' : 's' }}?</h2>
      </div>
      <p id="delete-confirm-desc" class="confirm-dialog__desc">
        This removes the following from {{ scopeLabel }} on the selected branch. This action cannot be undone.
      </p>
      <ul class="confirm-dialog__list">
        <li v-for="name in items" :key="name">{{ name }}</li>
      </ul>
      <div class="confirm-dialog__actions">
        <button ref="cancelButton" type="button" class="btn-text" @click="cancel">Cancel</button>
        <button type="button" class="btn-danger" @click="confirm">Delete permanently</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.confirm-scrim {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  z-index: 75;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.confirm-dialog {
  @include overlay-surface(24px);
  @include thin-scrollbar;
  @include reduced-motion;

  width: min(440px, 100%);
  max-height: 80vh;
  overflow-y: auto;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: $font-stack;
  color: var(--onsurf);
}

.confirm-dialog__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.confirm-dialog__icon {
  color: var(--err);
  flex-shrink: 0;
}

.confirm-dialog__title {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
}

.confirm-dialog__desc {
  margin: 0;
  font-size: 13px;
  color: var(--onsurfv);
  line-height: 1.5;
}

.confirm-dialog__list {
  margin: 0;
  padding: 10px 14px;
  background: var(--errc);
  color: var(--err);
  border-radius: 12px;
  font-family: monospace;
  font-size: 12.5px;
  max-height: 160px;
  overflow-y: auto;
  list-style: disc;
  padding-left: 30px;
}

.confirm-dialog__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 6px;
}

.btn-text {
  @include focus-ring;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13.5px;
  cursor: pointer;
  color: var(--onprimc);
  background: none;
  border: none;
}

.btn-danger {
  @include focus-ring;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  background: var(--err);
  color: var(--errc);
  border: none;
}
</style>
