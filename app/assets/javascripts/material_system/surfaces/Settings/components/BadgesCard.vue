<template>
  <section class="st-card" data-screen-label="Project badges">
    <h2 class="st-card__title">Project badges</h2>
    <p>Use %{project_path}, %{project_id}, %{default_branch}, %{commit_sha}, or %{latest_tag} placeholders in badge URLs.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="busy" role="status">Updating badges…</p>
    <gl-form @submit.prevent="save">
      <gl-form-group label="Badge name" label-for="st-badge-name"><gl-form-input id="st-badge-name" v-model="draft.name" :disabled="busy" /></gl-form-group>
      <gl-form-group label="Image URL" label-for="st-badge-image"><gl-form-input id="st-badge-image" v-model="draft.imageUrl" :disabled="busy" required /></gl-form-group>
      <gl-form-group label="Link URL" label-for="st-badge-link"><gl-form-input id="st-badge-link" v-model="draft.linkUrl" :disabled="busy" required /></gl-form-group>
      <gl-button type="submit" variant="confirm" :disabled="busy">{{ draft.id ? 'Save badge' : 'Add badge' }}</gl-button>
      <gl-button v-if="draft.id" :disabled="busy" @click="resetDraft">Cancel edit</gl-button>
    </gl-form>
    <article v-for="badge in badges" :key="`${badge.inherited ? 'group' : 'project'}-${badge.id}`" class="st-badge-entry">
      <h3>{{ badge.name || 'Unnamed badge' }}</h3>
      <p v-if="badge.inherited">Inherited from a group. Manage this badge in its group settings.</p>
      <gl-button v-if="!badge.inherited" :disabled="busy" @click="edit(badge)">Edit</gl-button>
      <gl-button v-if="!badge.inherited" variant="danger" :disabled="busy" @click="pendingDelete = badge">Delete</gl-button>
      <gl-button :disabled="!previewUrl(badge)" @click="previewId = badge.id">Preview badge</gl-button>
      <img v-if="previewId === badge.id && previewUrl(badge)" :src="previewUrl(badge)" :alt="badge.name || 'Badge preview'" />
    </article>
    <p v-if="!busy && !error && !badges.length">No project or inherited badges.</p>
    <ConfirmDialog v-if="pendingDelete" title="Delete project badge?" :description="`Remove ${pendingDelete.name || 'this badge'} from the project?`" confirm-label="Delete badge" @confirm="remove" @cancel="pendingDelete = null" />
  </section>
</template>

<script>
import { GlButton, GlForm, GlFormGroup, GlFormInput } from '@gitlab/ui';
import ConfirmDialog from './ConfirmDialog.vue';

const emptyDraft = () => ({ name: '', imageUrl: '', linkUrl: '' });

export default {
  name: 'BadgesCard',
  components: { GlButton, GlForm, GlFormGroup, GlFormInput, ConfirmDialog },
  props: { adapter: { type: Object, required: true } },
  data() { return { badges: [], draft: emptyDraft(), busy: false, error: '', pendingDelete: null, previewId: null }; },
  created() { this.run(() => this.adapter.loadBadges()); },
  methods: {
    async run(operation) {
      if (this.busy) return false;
      this.busy = true;
      this.error = '';
      try { this.badges = await operation(); this.previewId = null; return true; }
      catch (error) { this.error = error.message; return false; }
      finally { this.busy = false; }
    },
    resetDraft() { this.draft = emptyDraft(); },
    edit(badge) { if (!this.busy && !badge.inherited) this.draft = { id: badge.id, name: badge.name, imageUrl: badge.imageUrl, linkUrl: badge.linkUrl }; },
    async save() { if (await this.run(() => this.adapter.saveBadge({ ...this.draft }))) this.resetDraft(); },
    async remove() {
      const badge = this.pendingDelete;
      if (!badge || badge.inherited || this.busy) return;
      if (await this.run(() => this.adapter.removeBadge(badge.id))) this.pendingDelete = null;
    },
    previewUrl(badge) {
      try {
        const url = new URL(badge.renderedImageUrl);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
      } catch (_error) { return ''; }
    },
  },
};
</script>

<style scoped>
.st-badge-entry { padding-block: 12px; border-top: 1px solid var(--st-outlv); }
.st-badge-entry img { display: block; max-width: 100%; margin-block-start: 8px; }
</style>
