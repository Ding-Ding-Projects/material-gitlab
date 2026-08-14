<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, ChevronRight, Cpu, MessageSquarePlus, Sparkles } from 'lucide-vue-next';
import type { ChatEvents, HostDataProps } from './types';
import { cn } from './lib/utils';
import BridgeStatusBadge from './components/BridgeStatusBadge.vue';

const props = withDefaults(defineProps<HostDataProps>(), {
  models: () => [],
  userName: 'Duo teammate',
  avatarUrl: '',
});

const emit = defineEmits<ChatEvents>();
const selectedModel = ref(props.models[0]?.value ?? '');

const selectedModelLabel = computed(
  () => props.models.find((model) => model.value === selectedModel.value)?.text ?? 'Choose a model',
);

function selectModel(value: string) {
  selectedModel.value = value;
  emit('change-model', value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
</script>

<template>
  <main class="duo-shell" aria-labelledby="duo-title">
    <header class="top-app-bar">
      <div class="brand-lockup">
        <div class="brand-icon" aria-hidden="true"><Sparkles :size="20" /></div>
        <div>
          <p class="eyebrow">Duo workspace</p>
          <h1 id="duo-title">Duo Next</h1>
        </div>
      </div>
      <div class="profile-chip" :title="props.userName">
        <img v-if="props.avatarUrl" class="avatar" :src="props.avatarUrl" :alt="`${props.userName}'s avatar`" />
        <span v-else class="avatar avatar-fallback" aria-hidden="true">{{ initials(props.userName) }}</span>
        <span class="profile-name">{{ props.userName }}</span>
      </div>
    </header>

    <section class="hero-card" aria-describedby="duo-description">
      <div class="hero-copy">
        <span class="status-pill"><span class="status-dot" aria-hidden="true" /> Ready to collaborate</span>
        <h2>Pick a model, then make something useful.</h2>
        <p id="duo-description">
          Your selected model is ready for the next conversation. Change it any time without leaving this workspace.
        </p>
        <button class="filled-button" type="button" @click="emit('new-chat')">
          <MessageSquarePlus :size="18" aria-hidden="true" />
          Start a new chat
        </button>
        <BridgeStatusBadge class="bridge-status" @retry="emit('new-chat')" />
      </div>
      <div class="hero-orb" aria-hidden="true"><Cpu :size="48" stroke-width="1.5" /></div>
    </section>

    <section class="models-section" aria-labelledby="models-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Available to you</p>
          <h2 id="models-heading">Choose a model</h2>
        </div>
        <span class="model-count">{{ props.models.length }} {{ props.models.length === 1 ? 'model' : 'models' }}</span>
      </div>

      <div v-if="props.models.length" class="model-grid" role="list" aria-label="Available models">
        <button
          v-for="model in props.models"
          :key="model.value"
          :class="cn('model-card', selectedModel === model.value && 'model-card-selected')"
          type="button"
          role="listitem"
          :aria-pressed="selectedModel === model.value"
          @click="selectModel(model.value)"
        >
          <span class="model-card-icon" aria-hidden="true"><Cpu :size="19" /></span>
          <span class="model-card-copy">
            <strong>{{ model.text }}</strong>
            <small>{{ model.value }}</small>
          </span>
          <span v-if="selectedModel === model.value" class="selected-mark" aria-label="Selected"><Check :size="17" /></span>
          <ChevronRight v-else class="model-chevron" :size="18" aria-hidden="true" />
        </button>
      </div>
      <div v-else class="empty-state">
        <Cpu :size="28" aria-hidden="true" />
        <div>
          <h3>No models connected yet</h3>
          <p>Ask your host to provide an available model, then return here to choose it.</p>
        </div>
      </div>
    </section>

    <footer class="selection-footer" aria-live="polite">
      <span class="footer-label">Current model</span>
      <strong>{{ selectedModelLabel }}</strong>
      <button class="text-button" type="button" @click="emit('send-chat-prompt')">Open conversation <ChevronRight :size="17" aria-hidden="true" /></button>
    </footer>
  </main>
</template>
