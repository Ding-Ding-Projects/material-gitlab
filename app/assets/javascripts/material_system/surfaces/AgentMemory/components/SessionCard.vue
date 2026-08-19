<template>
  <div :id="`am-anchor-session-${session.id}`" class="am-card am-session-card" :data-am-anchor="`session-${session.id}`" tabindex="-1">
    <div class="am-session-card__head">
      <label class="am-row__checkbox">
        <input
          type="checkbox"
          :checked="selected"
          :aria-label="`Select session ${session.agent}`"
          @change="$emit('toggle-select', session.id)"
        />
      </label>
      <span class="am-session-card__dot" :class="`am-session-card__dot--${session.statusTone}`" aria-hidden="true"></span>
      <span class="am-session-card__agent">{{ session.agent }}</span>
      <span class="am-session-card__when">{{ whenLabel }}</span>
    </div>
    <div class="am-session-card__task">{{ session.task }}</div>
    <div class="am-session-card__evidence">
      <div><strong>Baseline</strong> · {{ session.baseline }}</div>
      <div><strong>Evidence</strong> · {{ session.evidence }}</div>
      <div><strong>Next gate</strong> · {{ session.gate }}</div>
    </div>
    <form class="am-session-card__reply" @submit.prevent="send">
      <label :for="`am-reply-${session.id}`" class="am-visually-hidden">Reply to {{ session.agent }} inbox</label>
      <input
        :id="`am-reply-${session.id}`"
        type="text"
        class="am-session-card__reply-input"
        placeholder="Reply to session inbox…"
        :value="draft"
        @input="$emit('draft', $event.target.value)"
      />
      <button type="submit" class="am-session-card__send" aria-label="Send reply">
        <MaterialIcon name="send" :size="17" />
      </button>
    </form>
    <div v-if="lastReply" class="am-session-card__delivered">Delivered to inbox: "{{ lastReply }}"</div>
  </div>
</template>

<script>
import { formatRelativeTime } from '../data';
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'SessionCard',
  components: { MaterialIcon },
  props: {
    session: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    draft: {
      type: String,
      default: '',
    },
    lastReply: {
      type: String,
      default: '',
    },
    now: {
      type: Number,
      required: true,
    },
  },
  computed: {
    whenLabel() {
      return formatRelativeTime(this.session, this.now);
    },
  },
  methods: {
    send() {
      if (!this.draft.trim()) return;
      this.$emit('send', this.session.id);
    },
  },
};
</script>
