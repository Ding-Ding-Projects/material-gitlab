/**
 * View model for the Secure surface (dependency list, audit events, scan
 * policies, on-demand scans), ported from Secure.dc.html's renderVals().
 *
 * Every mutation is exposed as an async function so a real REST/GraphQL
 * client can replace the body without touching call sites in Secure.vue.
 */

import { requireEndpoint } from '../live-data';
import { operationsCollection, operationsConnection, operationsGraphql } from '../Deploy/transport';

export const SECURE_TAB_IDS = Object.freeze({
  DEPENDENCIES: 'dependencies',
  AUDIT_EVENTS: 'audit-events',
  SCAN_POLICIES: 'scan-policies',
  ON_DEMAND_SCANS: 'on-demand-scans',
});

export const SECURE_TABS = Object.freeze([
  { id: SECURE_TAB_IDS.DEPENDENCIES, label: 'Dependencies' },
  { id: SECURE_TAB_IDS.AUDIT_EVENTS, label: 'Audit events' },
  { id: SECURE_TAB_IDS.SCAN_POLICIES, label: 'Scan policies' },
  { id: SECURE_TAB_IDS.ON_DEMAND_SCANS, label: 'On-demand scans' },
]);

export const ROW_TONES = Object.freeze({
  PRIMARY: 'primary',
  NEUTRAL: 'neutral',
  DANGER: 'danger',
  SUCCESS: 'success',
  WARNING: 'warning',
});

// Test-only fixture factories mirror Secure.dc.html's shape. Production
// entries never call these factories; they require host-provided endpoints.
const seedDependencies = () => [
  {
    id: 'dep-1',
    name: 'sortable-tree 1.8.2',
    packageManager: 'npm',
    origin: 'transitive via boards-ui',
    vulnerability: 'CVE-2026-1142 high',
    license: 'MIT',
  },
  { id: 'dep-2', name: 'rails 7.2.4', packageManager: 'gem', origin: 'direct', vulnerability: null, license: 'MIT' },
  { id: 'dep-3', name: 'sidekiq 7.3.1', packageManager: 'gem', origin: 'direct', vulnerability: null, license: 'LGPL-3.0' },
  { id: 'dep-4', name: 'lodash 4.17.21', packageManager: 'npm', origin: 'direct', vulnerability: null, license: 'MIT' },
  {
    id: 'dep-5',
    name: 'yaml 2.4.0',
    packageManager: 'npm',
    origin: 'transitive via pipeline-editor',
    vulnerability: 'advisory pending',
    license: 'ISC',
  },
];

const seedAuditEvents = () => [
  { id: 'audit-1', name: 'Member role changed: pnair Reporter → Developer', sub: 'by dweiss · from 10.4.8.20', when: '2h ago' },
  { id: 'audit-2', name: 'Protected branch rule added: release/*', sub: 'by dweiss', when: '1d ago' },
  { id: 'audit-3', name: 'CI variable REGISTRY_PASSWORD updated', sub: 'by junpark · masked', when: '2d ago' },
  { id: 'audit-4', name: 'Sign-in from new location', sub: 'ohaddad · Berlin, DE · 2FA passed', when: '3d ago' },
  { id: 'audit-5', name: 'Personal access token created (api scope)', sub: 'junpark · expires in 30d', when: '5d ago' },
];

const seedScanPolicies = () => [
  {
    id: 'policy-1',
    name: 'Require SAST + secret detection on all MRs',
    sub: 'scan execution policy · enforced on main',
    enforced: true,
  },
  {
    id: 'policy-2',
    name: 'Block critical vulnerabilities from merging',
    sub: 'merge request approval policy · 1 approval override',
    enforced: true,
  },
  { id: 'policy-3', name: 'Weekly DAST against staging', sub: 'scheduled scan policy', enforced: false },
];

const seedOnDemandScans = () => [
  { id: 'scan-1', name: 'DAST — staging full crawl', sub: 'on-demand · last run 42 findings triaged', status: 'ready' },
  { id: 'scan-2', name: 'Secret detection — full history', sub: 'on-demand · long-running', status: 'running' },
  { id: 'scan-3', name: 'Container scan — v17.2.0 image', sub: 'on-demand', status: 'ready' },
];

export const SECURE_POLICIES_QUERY = `query MaterialSecurePolicies($projectPath: ID!, $after: String) {
  project(fullPath: $projectPath) { securityPolicies(first: 100, after: $after, includeUnscoped: false, relationship: INHERITED) {
    nodes { id name type editPath enabled updatedAt }
    pageInfo { hasNextPage endCursor }
  } }
}`;
export const SECURE_SCANS_QUERY = `query MaterialSecureScans($projectPath: ID!, $after: String) {
  project(fullPath: $projectPath) { pipelines(source: "ondemand_dast_scan", first: 100, after: $after) {
    nodes { id path createdAt detailedStatus { text group } dastProfile { name dastSiteProfile { targetUrl } } }
    pageInfo { hasNextPage endCursor }
  } }
}`;

export async function fetchDependencies({ endpoint, fetchImpl } = {}) {
  const rows = await operationsCollection(requireEndpoint({ value: endpoint }, 'value'), { fetchImpl, unwrap: (payload) => payload.dependencies });
  return rows.map((dependency) => ({
    id: String(dependency.occurrence_id), name: [dependency.name, dependency.version].filter(Boolean).join(' '),
    packageManager: dependency.packager || '', origin: dependency.location?.path || '',
    href: dependency.vulnerabilities?.[0]?.url || dependency.location?.blob_path,
    vulnerability: dependency.vulnerabilities?.[0]?.name || null,
    license: dependency.licenses?.map((license) => license.name).join(', ') || '',
  }));
}

export async function fetchAuditEvents({ endpoint, fetchImpl } = {}) {
  const rows = await operationsCollection(requireEndpoint({ value: endpoint }, 'value'), {
    fetchImpl, unwrap: (payload) => payload.events,
    nextPage: (payload, original) => {
      if (!payload.next_page) return '';
      const url = new URL(original, globalThis.location?.origin || 'http://localhost');
      url.searchParams.set('page', payload.next_page);
      return url.pathname + url.search;
    },
  });
  return rows.map((event) => ({ id: String(event.id), name: event.action, sub: [event.author?.name, event.target].filter(Boolean).join(' � '), when: event.date, href: event.object?.url }));
}

export async function fetchScanPolicies({ endpoint, projectPath, fetchImpl } = {}) {
  const rows = await operationsConnection(endpoint, SECURE_POLICIES_QUERY, { projectPath }, (data) => data.project?.securityPolicies, { fetchImpl });
  return rows.map((policy) => ({ id: policy.id, name: policy.name, sub: policy.type, enforced: policy.enabled, href: policy.editPath }));
}

export async function fetchOnDemandScans({ endpoint, projectPath, fetchImpl } = {}) {
  const rows = await operationsConnection(endpoint, SECURE_SCANS_QUERY, { projectPath }, (data) => data.project?.pipelines, { fetchImpl });
  return rows.map((scan) => ({ id: scan.id, name: scan.dastProfile?.name || scan.id, sub: scan.dastProfile?.dastSiteProfile?.targetUrl || '', status: scan.detailedStatus?.group || '', href: scan.path }));
}

export async function updateScanStatus(scanId, status, { endpoint, fetchImpl } = {}) {
  const operation = status === 'running' ? 'pipelineRetry' : 'pipelineCancel';
  const data = await operationsGraphql(endpoint, `mutation MaterialSecurePipeline($id: CiPipelineID!) {
    ${operation}(input: { id: $id }) { errors }
  }`, { id: scanId }, { fetchImpl });
  const result = data[operation];
  if (!result || result.errors?.length) throw new Error(result?.errors?.join('; ') || 'The scan operation was not accepted.');
}

export function toDependencyRow(dependency) {
  const vulnerable = Boolean(dependency.vulnerability);
  return {
    id: dependency.id,
    href: dependency.href,
    icon: 'git-branch',
    tone: vulnerable ? ROW_TONES.DANGER : ROW_TONES.PRIMARY,
    titleMonospace: true,
    title: dependency.name,
    sub: `${dependency.packageManager} · ${dependency.origin} · ${dependency.license}`,
    badge: dependency.vulnerability,
    badgeTone: ROW_TONES.DANGER,
    meta: '',
    searchText: `${dependency.name} ${dependency.packageManager} ${dependency.origin} ${dependency.vulnerability || ''} ${dependency.license}`,
  };
}

export function toAuditRow(auditEvent) {
  return {
    id: auditEvent.id,
    href: auditEvent.href,
    icon: 'receipt',
    tone: ROW_TONES.NEUTRAL,
    titleMonospace: false,
    title: auditEvent.name,
    sub: auditEvent.sub,
    badge: null,
    badgeTone: null,
    meta: auditEvent.when,
    searchText: `${auditEvent.name} ${auditEvent.sub}`,
  };
}

export function toScanPolicyRow(policy) {
  return {
    id: policy.id,
    href: policy.href,
    icon: 'shield',
    tone: ROW_TONES.PRIMARY,
    titleMonospace: false,
    title: policy.name,
    sub: policy.sub,
    badge: policy.enforced ? 'Enforced' : 'Disabled',
    badgeTone: policy.enforced ? ROW_TONES.SUCCESS : ROW_TONES.NEUTRAL,
    meta: '',
    actionLabel: null,
    actionDestructive: policy.enforced,
    searchText: policy.name,
  };
}

export function toOnDemandScanRow(scan) {
  const running = scan.status === 'running';
  return {
    id: scan.id,
    href: scan.href,
    icon: 'radar',
    tone: ROW_TONES.PRIMARY,
    titleMonospace: false,
    title: scan.name,
    sub: scan.sub,
    badge: scan.status,
    badgeTone: running ? ROW_TONES.WARNING : ROW_TONES.SUCCESS,
    meta: '',
    actionLabel: running ? 'Cancel' : 'Retry',
    actionDestructive: running,
    searchText: scan.name,
  };
}

/** Builds a case-insensitive plain-text or regex matcher, mirroring Secure.dc.html's matcher(). */
export function createTextMatcher(query, regexMode) {
  if (!query) return { test: () => true, valid: true };
  if (regexMode) {
    try {
      const expression = new RegExp(query, 'i');
      return { test: (text) => expression.test(text), valid: true };
    } catch (error) {
      return { test: () => true, valid: false, error: error.message };
    }
  }
  const lowered = query.toLowerCase();
  return { test: (text) => text.toLowerCase().includes(lowered), valid: true };
}

/** Serializes selected rows to a CSV blob for the "Export selected" bulk action. */
export function rowsToCsv(rows) {
  const header = ['Title', 'Details', 'Status'];
  const lines = rows.map((row) =>
    [row.title, row.sub, row.badge || row.meta || ''].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','),
  );
  return [header.join(','), ...lines].join('\n');
}
