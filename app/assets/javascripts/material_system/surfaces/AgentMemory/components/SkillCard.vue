<template>
  <div :id="`am-anchor-${skill.id}`" class="am-card am-skill-card" :data-am-anchor="skill.id" tabindex="-1">
    <div class="am-skill-card__head">
      <label class="am-row__checkbox">
        <input
          type="checkbox"
          :checked="selected"
          :aria-label="`Select ${skill.name}`"
          @change="$emit('toggle-select', skill.id)"
        />
      </label>
      <MaterialIcon :name="skill.icon" :size="20" class="am-skill-card__icon" />
      <span class="am-skill-card__name">{{ skill.name }}</span>
      <span class="am-badge am-badge--small" :class="`am-badge--${skill.status === 'installed' ? 'in-sync' : 'neutral'}`">
        {{ skill.status }}
      </span>
    </div>
    <div class="am-skill-card__desc">{{ skill.description }}</div>
    <div v-if="skill.removable" class="am-skill-card__actions">
      <button type="button" class="am-btn am-btn--text am-btn--small am-btn--danger-text" @click="$emit('uninstall', skill)">
        Uninstall
      </button>
    </div>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'SkillCard',
  components: { MaterialIcon },
  props: {
    skill: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
