<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, CheckCircle2, CloudOff, LoaderCircle, RefreshCw } from 'lucide-vue-next';
import { cn } from '../lib/utils';

type BridgeStatus = 'ready' | 'syncing' | 'offline' | 'error';

const props = withDefaults(
  defineProps<{
    status?: BridgeStatus;
    label?: string;
    detail?: string;
    retryLabel?: string;
    compact?: boolean;
  }>(),
  {
    status: 'ready',
    label: '',
    detail: '',
    retryLabel: 'Try again',
    compact: false,
  },
);

const emit = defineEmits<{
  retry: [];
}>();

const statusCopy: Record<BridgeStatus, { label: string; detail: string; tone: string }> = {
  ready: {
    label: 'Connected to your workspace',
    detail: 'Messages and model choices are ready to sync.',
    tone: 'bridge-status-badge--ready',
  },
  syncing: {
    label: 'Syncing with your workspace',
    detail: 'Your latest state is on its way.',
    tone: 'bridge-status-badge--syncing',
  },
  offline: {
    label: 'Working offline',
    detail: 'Changes stay here until the host reconnects.',
    tone: 'bridge-status-badge--offline',
  },
  error: {
    label: 'Connection needs attention',
    detail: 'The host did not accept the latest update.',
    tone: 'bridge-status-badge--error',
  },
};

const copy = computed(() => statusCopy[props.status]);
const hasRetry = computed(() => props.status === 'error' && Boolean(props.retryLabel));
const icon = computed(() => {
  if (props.status === 'syncing') return LoaderCircle;
  if (props.status === 'offline') return CloudOff;
  if (props.status === 'error') return AlertTriangle;
  return CheckCircle2;
});

const classes = computed(() =>
  cn('bridge-status-badge', copy.value.tone, props.compact && 'bridge-status-badge--compact'),
);
</script>

<template>
  <section class="bridge-status-badge-shell" aria-live="polite">
    <div :class="classes" role="status">
      <span class="bridge-status-badge__icon" aria-hidden="true">
        <component :is="icon" :size="18" :class="props.status === 'syncing' && 'bridge-status-badge__spinner'" />
      </span>
      <span class="bridge-status-badge__copy">
        <strong>{{ props.label || copy.label }}</strong>
        <span v-if="!props.compact">{{ props.detail || copy.detail }}</span>
      </span>
      <button
        v-if="hasRetry"
        class="bridge-status-badge__retry"
        type="button"
        :aria-label="props.retryLabel"
        @click="emit('retry')"
      >
        <RefreshCw :size="16" aria-hidden="true" />
        <span>{{ props.retryLabel }}</span>
      </button>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.bridge-status-badge-shell {
  --bridge-status-surface: color-mix(in srgb, var(--md-sys-color-surface-container) 88%, transparent);
  --bridge-status-border: var(--md-sys-color-outline);
  display: grid;
  gap: 8px;
  width: 100%;
}

.bridge-status-badge {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 12px 14px;
  border: 1px solid var(--bridge-status-border);
  border-radius: var(--md-sys-shape-corner-large);
  color: var(--md-sys-color-on-surface);
  background: var(--bridge-status-surface);
  box-shadow: var(--md-sys-elevation-1);
}

.bridge-status-badge--compact {
  min-height: 44px;
  padding-block: 8px;
}

.bridge-status-badge__icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: var(--md-sys-shape-corner-medium);
  color: var(--bridge-status-accent, var(--md-sys-color-primary));
  background: color-mix(in srgb, var(--bridge-status-accent, var(--md-sys-color-primary)) 14%, transparent);
}

.bridge-status-badge__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
  line-height: 1.35;
}

.bridge-status-badge__copy strong,
.bridge-status-badge__copy span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.bridge-status-badge__copy strong { font-size: 0.9rem; }
.bridge-status-badge__copy span { color: var(--md-sys-color-on-surface-variant); font-size: 0.78rem; }

.bridge-status-badge__retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-extra-large);
  color: var(--md-sys-color-on-primary);
  background: var(--md-sys-color-primary);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.bridge-status-badge__retry:hover { filter: brightness(0.94); }
.bridge-status-badge__retry:focus-visible { outline: 3px solid color-mix(in srgb, var(--md-sys-color-primary) 55%, var(--md-sys-color-inverse-on-surface)); outline-offset: 2px; }
.bridge-status-badge__spinner { animation: bridge-status-spin 900ms linear infinite; }

.bridge-status-badge--ready { --bridge-status-accent: var(--md-sys-color-success); }
.bridge-status-badge--syncing { --bridge-status-accent: var(--md-sys-color-primary); }
.bridge-status-badge--offline { --bridge-status-accent: var(--md-sys-color-warning); }
.bridge-status-badge--error { --bridge-status-accent: var(--md-sys-color-error); }

@keyframes bridge-status-spin { to { transform: rotate(360deg); } }

@media (max-width: 520px) {
  .bridge-status-badge { grid-template-columns: auto minmax(0, 1fr); }
  .bridge-status-badge__retry { grid-column: 2; justify-self: start; }
}

@media (prefers-reduced-motion: reduce) {
  .bridge-status-badge__spinner { animation: none; }
}
</style>
