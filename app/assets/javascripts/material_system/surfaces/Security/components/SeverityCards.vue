<script>
/**
 * The four severity summary cards. Ported from the design's `sevCards` /
 * `sc-for` loop; clicking a card toggles it as a filter on the vulnerability
 * list below (multiple cards can be active at once).
 */
export default {
  name: 'SeverityCards',
  props: {
    cards: {
      type: Array,
      required: true,
      // [{ key, label, count, bg, fg, active }]
    },
  },
};
</script>

<template>
  <div class="sec-severity-cards" role="group" aria-label="Filter vulnerabilities by severity">
    <button
      v-for="card in cards"
      :key="card.key"
      type="button"
      class="sec-severity-card"
      :style="{ background: card.bg, color: card.fg, borderColor: card.active ? card.fg : 'transparent' }"
      :aria-pressed="card.active"
      @click="$emit('toggle', card.key)"
    >
      <span class="sec-severity-card__count">{{ card.count }}</span>
      <span class="sec-severity-card__label">{{ card.label }}</span>
    </button>
  </div>
</template>
