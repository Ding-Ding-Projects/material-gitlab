<template>
  <section v-if="metadata.available === true" class="st-tab-panel" aria-label="Secrets Manager settings">
    <div class="st-card">
      <h2 class="st-card__title">Secrets Manager</h2>
      <p>Manage lifecycle and access permissions. Secret values are not requested by this settings page.</p>
      <p v-if="loading" role="status">Loading Secrets Manager metadata…</p>
      <gl-alert v-if="error" variant="danger" :dismissible="false">{{ error }}</gl-alert>
      <template v-if="state">
        <p role="status">Status: {{ state.status }}</p>
        <p v-if="!state.healthy">The secrets service is not healthy. Provisioning is unavailable.</p>
        <p v-if="entitlementBlocked">The current entitlement blocks lifecycle changes.</p>
        <p v-if="metadata.archived || metadata.marked_for_deletion">Lifecycle changes are unavailable while the project is archived or marked for deletion.</p>
        <gl-button v-if="state.status === 'INACTIVE'" variant="confirm" :disabled="!canInitialize || busy" @click="setEnabled(true)">Initialize Secrets Manager</gl-button>
        <gl-button v-if="canManage && state.status === 'ACTIVE'" variant="danger" :disabled="busy" @click="confirmDisable = true">Deprovision Secrets Manager</gl-button>
        <gl-button :disabled="busy || loading" @click="refresh">Refresh status</gl-button>
      </template>
    </div>
    <div v-if="state && state.status === 'ACTIVE'" class="st-card">
      <h2 class="st-card__title">Secrets Manager permissions</h2>
      <gl-form v-if="canManage" @submit.prevent="createPermission">
        <gl-form-group label="Principal type" label-for="st-secrets-principal-type"><gl-form-select id="st-secrets-principal-type" v-model="draft.type" :options="principalTypes" :disabled="busy" /></gl-form-group>
        <gl-form-group v-if="draft.type === 'GROUP'" label="Group path" label-for="st-secrets-group"><gl-form-input id="st-secrets-group" v-model.trim="draft.groupPath" placeholder="group/subgroup" :disabled="busy" required /></gl-form-group>
        <gl-form-group v-else-if="draft.type === 'ROLE'" label="Project role" label-for="st-secrets-role"><gl-form-select id="st-secrets-role" v-model="draft.role" :options="roles" :disabled="busy" /></gl-form-group>
        <template v-else>
          <gl-form-group label="Search eligible project members" label-for="st-secrets-member-search"><gl-form-input id="st-secrets-member-search" v-model.trim="memberSearch" :disabled="busy" @input="searchMembers" /></gl-form-group>
          <p v-if="draft.member">Selected member: {{ draft.member.name }} ({{ draft.member.username }})</p>
          <ul aria-label="Eligible project members"><li v-for="member in members" :key="member.id"><gl-button type="button" :aria-pressed="draft.member && draft.member.id === member.id" @click="draft.member = member">{{ member.name }} ({{ member.username }})</gl-button></li></ul>
        </template>
        <gl-form-checkbox v-model="draft.read" :disabled="busy">Read metadata</gl-form-checkbox>
        <gl-form-checkbox v-model="draft.readValue" :disabled="busy || !draft.read">Read secret value</gl-form-checkbox>
        <gl-form-checkbox v-model="draft.write" :disabled="busy || !draft.read">Write secrets</gl-form-checkbox>
        <gl-form-checkbox v-model="draft.delete" :disabled="busy || !draft.read">Delete secrets</gl-form-checkbox>
        <gl-button type="submit" variant="confirm" :disabled="busy">Add permission</gl-button>
      </gl-form>
      <ul aria-label="Configured Secrets Manager permissions"><li v-for="permission in state.permissions" :key="`${permission.principal.type}-${permission.principal.id}`"><strong>{{ principalName(permission.principal) }}</strong><span> {{ permission.actions.join(', ') }}</span><span v-if="permission.expiredAt"> Expires {{ permission.expiredAt }}</span><gl-button v-if="canManage" type="button" variant="danger" :disabled="busy" @click="requestDelete(permission.principal)">Remove</gl-button></li></ul>
    </div>
    <ConfirmDialog v-if="confirmDisable" title="Deprovision Secrets Manager?" description="This removes the Secrets Manager service and its stored secrets for this project. This action cannot be undone." confirm-label="Deprovision" :busy="busy" @cancel="confirmDisable = false" @confirm="setEnabled(false)" />
    <ConfirmDialog v-if="permissionToDelete" title="Remove Secrets Manager permission?" :description="`Remove permissions for ${principalName(permissionToDelete)}?`" confirm-label="Remove permission" :busy="busy" @cancel="permissionToDelete = null" @confirm="deletePermission" />
  </section>
</template>

<script>
import { GlAlert, GlButton, GlForm, GlFormCheckbox, GlFormGroup, GlFormInput, GlFormSelect } from '@gitlab/ui';
import ConfirmDialog from './ConfirmDialog.vue';
import { createSecretsManagerSettingsAdapter } from '../secrets_manager_settings_adapter';

const emptyDraft = () => ({ type: 'USER', member: null, groupPath: '', role: 20, read: true, readValue: false, write: false, delete: false });
export default {
  name: 'SecretsManagerSettingsCard',
  components: { GlAlert, GlButton, GlForm, GlFormCheckbox, GlFormGroup, GlFormInput, GlFormSelect, ConfirmDialog },
  props: { metadata: { type: Object, required: true } },
  data() { return { adapter: null, state: null, loading: false, busy: false, error: '', confirmDisable: false, permissionToDelete: null, members: [], memberSearch: '', draft: emptyDraft(), pollCount: 0 }; },
  computed: {
    canManage() { return this.metadata.available === true && this.metadata.allowed === true; },
    entitlementBlocked() { return this.metadata.paid_experience === true && ['BLOCKED', 'INELIGIBLE'].includes(this.state?.entitlement?.state); },
    canInitialize() { return this.canManage && this.state?.status === 'INACTIVE' && this.state.healthy && !this.entitlementBlocked && !this.metadata.archived && !this.metadata.marked_for_deletion; },
    principalTypes() { return [{ text: 'User', value: 'USER' }, { text: 'Group', value: 'GROUP' }, { text: 'Role', value: 'ROLE' }]; },
    roles() { return [{ text: 'Reporter', value: 20 }, { text: 'Developer', value: 30 }, { text: 'Maintainer', value: 40 }]; },
  },
  watch: { 'draft.read'(enabled) { if (!enabled) { this.draft.readValue = false; this.draft.write = false; this.draft.delete = false; } } },
  mounted() { if (this.metadata.available === true) { this.adapter = createSecretsManagerSettingsAdapter({ metadata: this.metadata }); this.refresh(); } },
  beforeDestroy() { clearTimeout(this.pollTimer); this.generation = (this.generation || 0) + 1; },
  methods: {
    principalName(principal) { return principal.user?.name || principal.group?.name || ({ 20: 'Reporter', 30: 'Developer', 40: 'Maintainer' }[principal.userRoleId || principal.id]) || `Role ${principal.id}`; },
    scheduleRefresh() { clearTimeout(this.pollTimer); if (['PROVISIONING', 'DEPROVISIONING'].includes(this.state?.status) && this.pollCount < 30) { this.pollCount += 1; this.pollTimer = setTimeout(() => this.refresh(), 2000); } },
    async refresh() {
      if (!this.adapter || this.metadata.available !== true) return;
      const generation = (this.generation || 0) + 1;
      this.generation = generation;
      this.loading = true;
      this.error = '';
      try { const state = await this.adapter.load(); if (generation === this.generation) { this.state = state; this.scheduleRefresh(); } }
      catch (error) { if (generation === this.generation) this.error = error.message; }
      finally { if (generation === this.generation) this.loading = false; }
    },
    async setEnabled(enabled) {
      if (!this.canManage || this.busy || (enabled ? !this.canInitialize : !this.confirmDisable)) return;
      this.busy = true;
      this.error = '';
      try { const status = await this.adapter.setEnabled(enabled); this.state = { ...this.state, status }; this.confirmDisable = false; this.pollCount = 0; this.scheduleRefresh(); }
      catch (error) { this.error = error.message; }
      finally { this.busy = false; }
    },
    async searchMembers() { if (!this.canManage || this.busy) return; try { this.members = await this.adapter.searchMembers(this.memberSearch); } catch (error) { this.error = error.message; } },
    async createPermission() {
      if (!this.canManage || this.busy || this.state?.status !== 'ACTIVE') return;
      const actions = [['read', 'READ'], ['readValue', 'READ_VALUE'], ['write', 'WRITE'], ['delete', 'DELETE']].filter(([key]) => this.draft[key]).map(([, action]) => action);
      const principal = this.draft.type === 'USER' ? { type: 'USER', id: this.draft.member?.id } : this.draft.type === 'GROUP' ? { type: 'GROUP', groupPath: this.draft.groupPath } : { type: 'ROLE', id: Number(this.draft.role) };
      this.busy = true;
      this.error = '';
      try { await this.adapter.createPermission({ principal, actions }); this.draft = emptyDraft(); await this.refresh(); }
      catch (error) { this.error = error.message; }
      finally { this.busy = false; }
    },
    requestDelete(principal) { if (this.canManage && !this.busy) this.permissionToDelete = principal; },
    async deletePermission() {
      const principal = this.permissionToDelete;
      if (!principal || !this.canManage || this.busy) return;
      this.busy = true;
      this.error = '';
      try { await this.adapter.deletePermission(principal); this.permissionToDelete = null; await this.refresh(); }
      catch (error) { this.error = error.message; }
      finally { this.busy = false; }
    },
  },
};
</script>
<style scoped>.st-tab-panel,.st-card{display:flex;flex-direction:column;gap:12px}.st-card__title{margin:0}</style>
