<template>
  <div class="gl-mds-plan__wiki" data-screen-label="Wiki" id="gl-mds-plan-panel-Wiki" role="tabpanel" aria-labelledby="gl-mds-plan-tab-Wiki">
    <wiki-page-list :pages="filteredPages" :active-id="activePage.id" @select="$emit('select', $event)" />
    <wiki-document
      :page="activePage"
      :editing="editing"
      @toggle-edit="$emit('toggle-edit')"
      @update-body="$emit('update-body', $event)"
    />
  </div>
</template>

<script>
import WikiPageList from './WikiPageList.vue';
import WikiDocument from './WikiDocument.vue';

export default {
  name: 'WikiPanel',
  components: { WikiPageList, WikiDocument },
  props: {
    filteredPages: { type: Array, required: true },
    activePage: { type: Object, required: true },
    editing: { type: Boolean, default: false },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__wiki {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 14px;
  max-width: 980px;
  align-items: start;
}

@media (max-width: 720px) {
  .gl-mds-plan__wiki {
    grid-template-columns: 1fr;
  }
}
</style>
