<template>
  <section class="st-tab-panel" aria-label="Project lifecycle settings">
    <div v-if="availableActions.length === 0" class="st-card" data-screen-label="Advanced project settings">
      <div class="st-card__title">Advanced project settings</div>
      <p class="st-empty">Advanced project maintenance is unavailable for your current project access.</p>
    </div>

    <div v-if="canRunHousekeeping" class="st-card" data-testid="material-housekeeping-card">
      <div class="st-card__title">Housekeeping</div>
      <p class="st-card__desc">Compress file revisions and remove unreachable objects in this project repository.</p>
      <gl-form ref="housekeepingForm" :action="actionFor('housekeeping')" method="post">
        <input :value="csrfToken" type="hidden" name="authenticity_token" />
        <gl-button type="submit" variant="confirm">Run housekeeping</gl-button>
      </gl-form>
      <gl-form ref="pruneForm" :action="actionFor('housekeeping')" method="post" @submit.prevent="requestPrune">
        <input :value="csrfToken" type="hidden" name="authenticity_token" />
        <input value="true" type="hidden" name="prune" />
        <gl-form-checkbox v-model="pruneAcknowledged">I understand that pruning unreachable objects can lead to repository corruption.</gl-form-checkbox>
        <gl-button type="submit" variant="danger" :disabled="!pruneAcknowledged">Prune unreachable objects</gl-button>
      </gl-form>
    </div>

    <div v-if="canExport" class="st-card" data-testid="material-export-card">
      <div class="st-card__title">Export project</div>
      <p class="st-card__desc">Create an export to move this project to another GitLab instance. CI/CD variables, pipeline triggers, webhooks, job logs, and artifacts are not exported.</p>
      <p class="st-card__desc">Container registry images and encrypted tokens are also excluded.</p>
      <p role="status">Export status: {{ metadata.export.status }}</p>
      <gl-form v-if="metadata.export.status === 'finished'" :action="actionFor('export', 'download_action')" method="get"><gl-button type="submit">Download export</gl-button></gl-form>
      <gl-form v-if="metadata.export.status === 'finished'" :action="actionFor('export', 'generate_action')" method="post"><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-button type="submit">Generate new export</gl-button></gl-form>
      <gl-form v-else :action="actionFor('export', 'export_action')" method="post"><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-button type="submit">Export project</gl-button></gl-form>
    </div>

    <div v-if="canPathChange" class="st-card" data-testid="material-path-change-card">
      <div class="st-card__title">Change path</div>
      <p class="st-card__desc">Changing the project path can require local repository and deployment service updates.</p>
      <gl-form :action="actionFor('path_change')" method="post">
        <input type="hidden" name="_method" value="patch" /><input type="hidden" name="material_settings_section" value="advanced" /><input :value="csrfToken" type="hidden" name="authenticity_token" />
        <gl-form-group label="Path" label-for="st-project-path"><gl-form-input-group><template #prepend><gl-input-group-text>{{ `${metadata.path_change.prefix}/` }}</gl-input-group-text></template><gl-form-input id="st-project-path" name="project[path]" :value="metadata.path_change.current_path" required /></gl-form-input-group></gl-form-group>
        <gl-button type="submit" variant="danger">Change path</gl-button>
      </gl-form>
    </div>

    <div v-if="canTransfer" class="st-card" data-testid="material-transfer-card">
      <div class="st-card__title">Transfer project</div>
      <p class="st-card__desc">Transfer changes the project namespace. Update local repository locations after a successful transfer.</p>
      <SearchField :value="transferQuery" placeholder="Search permitted destination namespaces" label="Search destination namespaces" :regex-mode="transferRegexMode" :regex-open="transferRegexOpen" :valid="transferMatcher.valid" :error="transferMatcher.error" :corpus="transferDestinationCorpus" corpus-title="Destination namespaces" @input="onTransferQuery" @toggle-regex="transferRegexMode = !transferRegexMode" @toggle-builder="transferRegexOpen = !transferRegexOpen" @apply-regex="applyTransferRegex" />
      <p v-if="transferLoading" class="st-card__desc" role="status">Loading permitted destination namespaces.</p>
      <p v-else-if="transferError" class="st-card__warning" role="status">Destination namespaces are unavailable. Refresh and try again.</p>
      <ul v-else class="st-destination-list" aria-label="Permitted destination namespaces">
        <li v-for="destination in filteredTransferDestinations" :key="destination.id"><MaterialButton variant="outlined" class="st-destination" :class="{ 'st-destination--selected': transferNamespaceId === destination.id }" :aria-pressed="transferNamespaceId === destination.id" @click="selectTransferDestination(destination)"><span>{{ destination.humanName }}</span><small>{{ destination.fullPath }}</small></MaterialButton></li>
        <li v-if="transferDestinations.length === 0" class="st-card__desc">No permitted destination namespaces are available.</li>
      </ul>
      <gl-button v-if="transferPage < transferTotalPages" type="button" :disabled="transferLoading" @click="loadMoreTransferDestinations">Load more namespaces</gl-button>
      <gl-form ref="transferForm" :action="actionFor('transfer')" method="post" @submit.prevent="requestTransfer">
        <input type="hidden" name="_method" value="put" /><input :value="csrfToken" type="hidden" name="authenticity_token" />
        <input name="new_namespace_id" type="hidden" :value="transferNamespaceId" />
        <gl-form-group :label="`Type ${metadata.transfer.confirm_phrase} to confirm`" label-for="st-transfer-confirmation"><gl-form-input id="st-transfer-confirmation" v-model.trim="transferConfirmation" autocomplete="off" required /></gl-form-group>
        <gl-button type="submit" variant="danger" :disabled="!canConfirmTransfer">Transfer project</gl-button>
      </gl-form>
    </div>

    <div v-if="canArchive" class="st-card" data-testid="material-archive-card">
      <div class="st-card__title">Archive project</div><p class="st-card__desc">Make this project read-only while retaining access to its data, work items, and merge requests.</p>
      <p v-if="metadata.archive.marked_for_deletion" class="st-card__warning" role="status">Restore this project from deletion before archiving it.</p>
      <gl-form ref="archiveForm" :action="actionFor('archive')" method="post" @submit.prevent="requestArchive"><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-button type="submit" :disabled="metadata.archive.marked_for_deletion">Archive</gl-button></gl-form>
    </div>

    <div v-if="canUnarchive" class="st-card" data-testid="material-unarchive-card"><div class="st-card__title">Unarchive project</div><p class="st-card__desc">Restore this project to an active state so that its content and settings can be changed again.</p><gl-form :action="actionFor('unarchive')" method="post"><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-button type="submit">Unarchive</gl-button></gl-form></div>

    <div v-if="canRemoveFork" class="st-card" data-testid="material-remove-fork-card">
      <div class="st-card__title">Remove fork relationship</div><p class="st-card__desc">The project can no longer send or receive merge requests to the upstream project or other forks after removal.</p>
      <gl-form ref="removeForkForm" :action="actionFor('remove_fork')" method="post" @submit.prevent="requestRemoveFork"><input type="hidden" name="_method" value="delete" /><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-form-group :label="`Type ${metadata.remove_fork.confirm_phrase} to confirm`" label-for="st-remove-fork-confirmation"><gl-form-input id="st-remove-fork-confirmation" v-model.trim="removeForkConfirmation" autocomplete="off" required /></gl-form-group><gl-button type="submit" variant="danger" :disabled="!canConfirmRemoveFork">Remove fork relationship</gl-button></gl-form>
    </div>

    <div v-if="canRestore" class="st-card" data-testid="material-restore-card"><div class="st-card__title">Restore project</div><p class="st-card__desc">Restore this project from scheduled deletion.</p><gl-form :action="actionFor('restore')" method="post"><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-button type="submit">Restore</gl-button></gl-form></div>

    <div v-if="metadata.delete && metadata.delete.mode === 'blocked'" class="st-card" role="status">Project deletion is controlled by an ancestor's scheduled deletion and cannot be requested separately.</div>
    <div v-if="canDelete" class="st-card st-card--danger" data-testid="material-delete-card">
      <div class="st-card__title">Delete project</div><p class="st-card__desc">{{ deleteDescription }}</p>
      <dl class="st-delete-counts"><template v-for="item in deleteCounts"><dt :key="`${item.label}-label`">{{ item.label }}</dt><dd :key="`${item.label}-value`">{{ item.value }}</dd></template></dl>
      <gl-form ref="deleteForm" :action="actionFor('delete', 'form_path')" method="post" @submit.prevent="requestDelete"><input type="hidden" name="_method" value="delete" /><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-form-group :label="`Type ${metadata.delete.confirm_phrase} to confirm`" label-for="st-delete-confirmation"><gl-form-input id="st-delete-confirmation" v-model.trim="deleteConfirmation" autocomplete="off" required /></gl-form-group><gl-button type="submit" variant="danger" :disabled="!canConfirmDelete">{{ metadata.delete.button_text }}</gl-button></gl-form>
    </div>

    <ConfirmDialog v-if="pendingAction" :title="pendingAction.title" :description="pendingAction.description" :confirm-label="pendingAction.confirmLabel" @confirm="submitPendingAction" @cancel="pendingAction = null" />
  </section>
</template>

<script>
import { GlButton, GlForm, GlFormCheckbox, GlFormGroup, GlFormInput, GlFormInputGroup, GlInputGroupText } from '@gitlab/ui';
import csrf from '~/lib/utils/csrf';
import ConfirmDialog from './ConfirmDialog.vue';
import SearchField from './SearchField.vue';
import { createMatcher } from '../data';
import { loadTransferDestinations } from '../advanced_destinations';
import MaterialButton from '~/material_system/components/material_button';

const safeLocalAction = (action) => typeof action === 'string' && action.startsWith('/') && !action.startsWith('//') && !/[\u0000-\u0020\\]/.test(action);

export default {
  name: 'AdvancedSettings',
  components: { GlButton, GlForm, GlFormCheckbox, GlFormGroup, GlFormInput, GlFormInputGroup, GlInputGroupText, ConfirmDialog, SearchField, MaterialButton },
  props: { metadata: { type: Object, default: () => ({}) } },
  data() { return { pruneAcknowledged: false, transferNamespaceId: '', transferConfirmation: '', transferQuery: '', transferRegexMode: false, transferRegexOpen: false, transferDestinations: [], transferPage: 1, transferTotalPages: 1, transferLoading: false, transferError: false, removeForkConfirmation: '', deleteConfirmation: '', pendingAction: null }; },
  computed: {
    csrfToken() { return csrf.token; },
    availableActions() { return ['housekeeping', 'path_change', 'transfer', 'archive', 'unarchive', 'remove_fork', 'restore'].filter((key) => this.actionAllowed(key)).concat(this.canExport ? ['export'] : [], this.canDelete ? ['delete'] : []); },
    canRunHousekeeping() { return this.actionAllowed('housekeeping'); },
    canExport() { return this.actionAllowed('export', 'export_action'); },
    canPathChange() { return this.actionAllowed('path_change'); },
    canTransfer() { return this.actionAllowed('transfer'); },
    canArchive() { return this.actionAllowed('archive'); },
    canUnarchive() { return this.actionAllowed('unarchive'); },
    canRemoveFork() { return this.actionAllowed('remove_fork'); },
    canRestore() { return this.actionAllowed('restore'); },
    canDelete() { return this.actionAllowed('delete', 'form_path'); },
    canConfirmTransfer() { return this.canTransfer && !this.transferLoading && !this.transferError && this.transferDestinations.some((item) => item.id === this.transferNamespaceId) && Boolean(this.metadata.transfer.confirm_phrase) && this.transferConfirmation === this.metadata.transfer.confirm_phrase; },
    canConfirmRemoveFork() { return this.canRemoveFork && Boolean(this.metadata.remove_fork.confirm_phrase) && this.removeForkConfirmation === this.metadata.remove_fork.confirm_phrase; },
    canConfirmDelete() { return this.canDelete && Boolean(this.metadata.delete.confirm_phrase) && this.deleteConfirmation === this.metadata.delete.confirm_phrase; },
    transferMatcher() { return createMatcher(this.transferQuery, { regexMode: this.transferRegexMode }); },
    transferDestinationCorpus() { return this.transferDestinations.map((destination) => `${destination.humanName} ${destination.fullPath}`); },
    filteredTransferDestinations() { return this.transferDestinations.filter((destination) => this.transferMatcher.test(`${destination.humanName} ${destination.fullPath}`)); },
    deleteDescription() { return this.metadata.delete.mode === 'immediate' ? 'This project is scheduled for deletion. This action permanently deletes it immediately and cannot be undone.' : 'This action schedules permanent deletion. Scheduled pipelines do not run during deletion.'; },
    deleteCounts() { return this.canDelete ? [['Issues', this.metadata.delete.issues_count], ['Merge requests', this.metadata.delete.merge_requests_count], ['Forks', this.metadata.delete.forks_count], ['Stars', this.metadata.delete.stars_count]].map(([label, value]) => ({ label, value })) : []; },
  },
  methods: {
    actionAllowed(key, actionKey = 'action') { const action = this.metadata?.[key]; return action?.allowed === true && safeLocalAction(action[actionKey]); },
    actionFor(key, actionKey = 'action') { return this.actionAllowed(key, actionKey) ? this.metadata[key][actionKey] : ''; },
    requestPrune() { if (this.pruneAcknowledged && this.canRunHousekeeping) this.openConfirmation('pruneForm', 'prune', 'Prune unreachable objects?', 'Pruning unreachable objects can lead to repository corruption. Are you sure you want to prune?', 'Prune'); },
    requestArchive() { if (this.canArchive && !this.metadata.archive.marked_for_deletion) this.openConfirmation('archiveForm', 'archive', 'Archive project?', 'This makes the project read-only. You can unarchive it later if the project is not blocked by an archived parent.', 'Archive'); },
    requestTransfer() { if (this.canConfirmTransfer) this.openConfirmation('transferForm', 'transfer', 'Transfer project?', 'This moves the project to the selected namespace and may change its visibility. Update local repository locations after the transfer.', 'Transfer project'); },
    requestRemoveFork() { if (this.canConfirmRemoveFork) this.openConfirmation('removeForkForm', 'remove_fork', 'Remove fork relationship?', 'This project will no longer be able to receive or send merge requests to the upstream project or other forks.', 'Remove fork relationship'); },
    requestDelete() { if (this.canConfirmDelete) this.openConfirmation('deleteForm', 'delete', 'Delete project?', this.deleteDescription, this.metadata.delete.button_text); },
    onTransferQuery(query) {
      this.transferQuery = query;
      if (this.transferRegexMode) return;
      clearTimeout(this.transferQueryTimer);
      this.transferQueryTimer = setTimeout(() => this.loadTransferDestinations(), 250);
    },
    applyTransferRegex(pattern) { this.transferQuery = pattern; this.transferRegexMode = true; this.transferRegexOpen = false; },
    selectTransferDestination(destination) { if (!this.transferLoading && this.transferDestinations.some((item) => item.id === destination.id)) this.transferNamespaceId = destination.id; },
    async loadTransferDestinations({ page = 1, append = false } = {}) {
      if (!this.canTransfer) return;
      const generation = (this.transferGeneration || 0) + 1;
      this.transferGeneration = generation;
      this.transferLoading = true;
      this.transferError = false;
      try {
        const result = await loadTransferDestinations({ projectId: this.metadata.transfer.project_id, page, query: this.transferRegexMode ? '' : this.transferQuery, showUserTransferLocations: this.metadata.transfer.show_user_transfer_locations });
        if (generation !== this.transferGeneration) return;
        const rows = [...result.users, ...result.groups];
        this.transferDestinations = append ? [...this.transferDestinations, ...rows.filter((row) => !this.transferDestinations.some((existing) => existing.id === row.id))] : rows;
        this.transferPage = page;
        this.transferTotalPages = result.totalPages;
      } catch (_error) {
        if (generation !== this.transferGeneration) return;
        this.transferError = true;
        if (!append) this.transferDestinations = [];
      } finally {
        if (generation === this.transferGeneration) this.transferLoading = false;
      }
    },
    loadMoreTransferDestinations() { return this.loadTransferDestinations({ page: this.transferPage + 1, append: true }); },
    openConfirmation(form, key, title, description, confirmLabel) { this.pendingAction = { form, key, title, description, confirmLabel }; },
    canSubmit(key) { if (key === 'prune') return this.pruneAcknowledged && this.canRunHousekeeping; if (key === 'archive') return this.canArchive && !this.metadata.archive.marked_for_deletion; if (key === 'transfer') return this.canConfirmTransfer; if (key === 'remove_fork') return this.canConfirmRemoveFork; if (key === 'delete') return this.canConfirmDelete; return false; },
    submitPendingAction() { const pending = this.pendingAction; this.pendingAction = null; if (!pending || !this.canSubmit(pending.key)) return; const ref = this.$refs[pending.form]; const form = ref?.$el || ref; if (form && typeof form.submit === 'function') form.submit(); },
  },
  mounted() { if (this.canTransfer) this.loadTransferDestinations(); },
  beforeDestroy() { clearTimeout(this.transferQueryTimer); this.transferGeneration = (this.transferGeneration || 0) + 1; },
};
</script>

<style lang="scss" scoped>
.st-tab-panel { display: flex; flex-direction: column; gap: 14px; }
.st-card__desc, .st-card__warning { margin: 0; color: var(--st-onsurfv); font-size: 13.5px; line-height: 1.45; }
.st-card__warning { color: var(--st-err); }
.st-card--danger { border: 1px solid var(--st-err); }
.gl-form { display: flex; align-items: flex-start; flex-direction: column; gap: 10px; }
.st-delete-counts { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 0; color: var(--st-onsurfv); font-size: 13px; }
.st-delete-counts dt, .st-delete-counts dd { margin: 0; }
.st-destination-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
.st-destination { width: 100%; display: flex; flex-direction: column; text-align: left; gap: 2px; border: 1px solid var(--st-outl); border-radius: var(--st-radius-field); padding: 10px 12px; background: transparent; color: var(--st-onsurf); cursor: pointer; }
.st-destination small { color: var(--st-onsurfv); }
.st-destination--selected { border-color: var(--st-prim); background: var(--st-primc); color: var(--st-onprimc); }
</style>
