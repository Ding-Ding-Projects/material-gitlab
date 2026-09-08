import { createGitLabClient, requireProjectPath } from '../gitlabApi';
import axios from '~/lib/utils/axios_utils';

export const MERGE_REQUEST_STATES = Object.freeze(['Open', 'Merged', 'Closed']);
export const PIPELINE_STATUS_META = Object.freeze({
  success: Object.freeze({ icon: 'check_circle', colorVar: '--mr-good', label: 'Pipeline passed' }),
  running: Object.freeze({ icon: 'sync', colorVar: '--mr-warn', label: 'Pipeline running' }),
  failed: Object.freeze({ icon: 'cancel', colorVar: '--mr-err', label: 'Pipeline failed' }),
  unknown: Object.freeze({ icon: 'help', colorVar: '--mr-onsurfv', label: 'Pipeline status unavailable' }),
});
export const DETAIL_TABS = Object.freeze([
  { id: 'overview', label: 'Overview' },
  { id: 'changes', label: 'Changes' },
  { id: 'discussion', label: 'Discussion' },
]);
export const FILTER_DEFS = Object.freeze([
  { key: 'open', label: 'Open' },
  { key: 'merged', label: 'Merged' },
  { key: 'mine', label: 'Authored by me' },
]);
export const DEFAULT_FILTERS = Object.freeze({ open: true, merged: false, mine: false });
export const MERGE_PHRASES = Object.freeze([
  'Merging! Drum roll, please…',
  'Merging! We’re almost there…',
  'Merging! Changes will land soon…',
  'Merging! Lift-off in 5… 4… 3…',
]);

const displayState = (state) => (state === 'merged' ? 'Merged' : state === 'closed' ? 'Closed' : 'Open');
const displayPipeline = (pipeline) => ['success', 'failed', 'running'].includes(pipeline?.status) ? pipeline.status : 'unknown';
const authorName = (author) => author?.name || author?.username || 'Unknown author';

function mapChanges(changes = []) {
  return changes.map((change) => ({
    name: change.new_path || change.old_path || 'Changed file',
    add: change.added_lines || 0,
    del: change.deleted_lines || 0,
    lines: [],
  }));
}

function mapThreads(discussions = []) {
  return discussions.flatMap((discussion) => (discussion.notes || []).map((note) => ({
    id: discussion.id,
    author: authorName(note.author),
    when: note.created_at || '',
    text: note.body || '',
    resolved: Boolean(note.resolved),
  })));
}

export function normalizeMergeRequest(item, approvals = null) {
  const approvedCount = approvals?.approved_by?.length ?? item.approved_by?.length ?? 0;
  const requiredCount = approvals?.approvals_required ?? item.approvals_before_merge ?? 0;
  return {
    ...item,
    id: item.id,
    iid: item.iid,
    title: item.title || '',
    branch: item.source_branch || '',
    target: item.target_branch || '',
    state: displayState(item.state),
    author: authorName(item.author),
    when: item.updated_at || item.created_at || '',
    pipeline: displayPipeline(item.head_pipeline || item.pipeline),
    approvals: approvals || item.approved_by ? `${approvedCount}/${requiredCount}` : 'Unavailable',
    approvedByMe: Boolean(approvals?.user_has_approved ?? item.user_has_approved),
    canMerge: Boolean(item.merge_status === 'can_be_merged' || item.detailed_merge_status === 'mergeable'),
    body: item.description || '',
    files: mapChanges(item.changes),
    threads: mapThreads(item.discussions),
    discussionCount: Number.isInteger(item.user_notes_count) ? item.user_notes_count : null,
    webUrl: item.web_url,
    mergeStatus: item.detailed_merge_status || item.merge_status,
  };
}

/** List-route adapter. Full review and authoring stay on their existing routes. */
export function createProjectMergeRequestsAdapter({ projectPath, permissions = {}, http = axios } = {}) {
  requireProjectPath(projectPath);
  const root = globalThis.gon?.relative_url_root || '';
  const base = `${root}/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests`;
  const accept = (item) => {
    if (!item?.id || !item?.iid || typeof item.title !== 'string' || !['opened', 'closed', 'merged', 'locked'].includes(item.state)) throw new Error('The server returned an invalid merge request.');
    return normalizeMergeRequest(item);
  };
  return {
    async listPage({ page = 1, perPage = 20, state = 'opened', mine = false, search = '' } = {}) {
      const response = await http.get(base, { params: { page, per_page: perPage, state, scope: mine ? 'created_by_me' : 'all', ...(search ? { search } : {}) } });
      if (!Array.isArray(response.data)) throw new Error('The server returned an invalid merge requests list.');
      const headers = response.headers || {};
      return {
        items: response.data.map(accept),
        page: Number(headers['x-page'] || page),
        totalPages: headers['x-total-pages'] ? Number(headers['x-total-pages']) : null,
        hasNextPage: headers['x-next-page'] !== undefined ? Boolean(headers['x-next-page']) : response.data.length === perPage,
      };
    },
    async close(iid) {
      if (permissions?.update !== true) throw new Error('Closing merge requests is unavailable for your current project access.');
      const response = await http.put(`${base}/${encodeURIComponent(iid)}`, { state_event: 'close' });
      const item = accept(response.data);
      if (item.state !== 'Closed') throw new Error('The server did not confirm that the merge request was closed.');
      return item;
    },
  };
}

export async function fetchMergeRequests({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) {
  requireProjectPath(projectPath);
  const response = await client.listMergeRequests({ state: 'all', per_page: 50, ...params });
  return Promise.all(response.map(async (item) => {
    try {
      return normalizeMergeRequest(item, await client.getMergeRequestApprovals(item.iid));
    } catch (_error) {
      return normalizeMergeRequest(item);
    }
  }));
}

export async function fetchMergeRequestDetail({ projectPath, iid, client = createGitLabClient(projectPath) } = {}) {
  requireProjectPath(projectPath);
  const [item, changes, discussions, approvals] = await Promise.all([
    client.getMergeRequest(iid),
    client.getMergeRequestChanges(iid),
    client.listMergeRequestDiscussions(iid),
    client.getMergeRequestApprovals(iid),
  ]);
  return normalizeMergeRequest({ ...item, changes: changes.changes || changes, discussions }, approvals);
}

export function avatarInitials(name) {
  return String(name || '').split(' ').filter(Boolean).map((word) => word[0]).join('').toUpperCase();
}

export const searchableText = (mr) => `${mr.title} ${mr.branch} !${mr.iid}`;

export function buildQueryMatcher(query, regexMode) {
  if (!query) return () => true;
  if (regexMode) {
    try { const re = new RegExp(query, 'i'); return (text) => re.test(text); } catch (_error) { return () => false; }
  }
  const needle = query.toLowerCase();
  return (text) => text.toLowerCase().includes(needle);
}

export function matchesFilters(mr, filters, currentUserName = '') {
  const stateMatches = (filters.open && mr.state === 'Open') || (filters.merged && mr.state === 'Merged') || (!filters.open && !filters.merged);
  return stateMatches && (!filters.mine || mr.author === currentUserName);
}

export function stateVisuals(state) {
  if (state === 'Merged') return { icon: 'call_merge', colorVar: '--mr-prim' };
  if (state === 'Closed') return { icon: 'block', colorVar: '--mr-err' };
  return { icon: 'adjust', colorVar: '--mr-good' };
}

export function toggleApproval(mr) {
  const approving = !mr.approvedByMe;
  const [approvedCount, requiredCount] = mr.approvals.split('/').map(Number);
  const nextApproved = Math.max(0, Math.min(requiredCount, approvedCount + (approving ? 1 : -1)));
  return { ...mr, approvedByMe: approving, approvals: `${nextApproved}/${requiredCount}` };
}

export const markMerged = (mr) => ({ ...mr, state: 'Merged', canMerge: false });

export function appendComment(mr, text, author = 'Current user') {
  const trimmed = String(text || '').trim();
  return trimmed ? { ...mr, threads: [...mr.threads, { author, when: 'just now', text: trimmed, resolved: false }] } : mr;
}

export function toggleThreadResolved(mr, threadIndex) {
  return { ...mr, threads: mr.threads.map((thread, index) => index === threadIndex ? { ...thread, resolved: !thread.resolved } : thread) };
}

export function closeMergeRequests(mrs, ids) {
  const idSet = new Set(ids);
  return mrs.map((mr) => (idSet.has(mr.id) && mr.state === 'Open' ? { ...mr, state: 'Closed', canMerge: false } : mr));
}

export const unresolvedThreadCount = (mr) => mr.threads.filter((thread) => !thread.resolved).length;
