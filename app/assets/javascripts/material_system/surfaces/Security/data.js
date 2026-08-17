/**
 * View-model data for the Security dashboard surface, ported from the design's
 * `Security.dc.html` DCLogic state. Field names track GitLab's real vulnerability
 * data (severity, scanner, location, state, identifiers, detectedAt, description)
 * so a real fetch (e.g. the project `vulnerabilities` GraphQL connection) can
 * replace `createSeedVulnerabilities()` without any component needing to change.
 */

export const SEVERITIES = Object.freeze(['critical', 'high', 'medium', 'low']);

export const SEVERITY_LABELS = Object.freeze({
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
});

// Each severity maps to a container/on-container CSS custom property pair
// defined in security.scss, so colors stay theme-aware without duplicating
// light/dark hex pairs in JavaScript.
export const SEVERITY_COLOR_VARS = Object.freeze({
  critical: { bg: 'var(--sec-err-c)', fg: 'var(--sec-err)' },
  high: { bg: 'var(--sec-high-c)', fg: 'var(--sec-high)' },
  medium: { bg: 'var(--sec-warn-c)', fg: 'var(--sec-warn)' },
  low: { bg: 'var(--sec-surf-ch)', fg: 'var(--sec-onsurf-v)' },
});

export const STATUSES = Object.freeze(['Needs triage', 'Confirmed', 'Dismissed', 'Resolved']);

// Statuses that no longer count toward the "open" severity badges, matching
// the design's sevCards count (`status !== 'Resolved' && status !== 'Dismissed'`).
export const CLOSED_STATUSES = Object.freeze(['Resolved', 'Dismissed']);

export const STATUS_COLOR_VARS = Object.freeze({
  'Needs triage': { bg: 'var(--sec-warn-c)', fg: 'var(--sec-warn)' },
  Confirmed: { bg: 'var(--sec-err-c)', fg: 'var(--sec-err)' },
  Dismissed: { bg: 'var(--sec-surf-ch)', fg: 'var(--sec-onsurf-v)' },
  Resolved: { bg: 'var(--sec-good-c)', fg: 'var(--sec-good)' },
});

const SEED_VULNERABILITIES = [
  {
    id: 1,
    severity: 'critical',
    title: 'SQL injection in issues search parameter',
    scanner: 'SAST · semgrep',
    location: 'app/controllers/issues_controller.rb:84',
    status: 'Needs triage',
    cve: 'CWE-89',
    detectedAt: '2d ago',
    description:
      'User-supplied sort parameter is interpolated into a raw ORDER BY clause. An attacker can read arbitrary rows via boolean-based blind injection.',
  },
  {
    id: 2,
    severity: 'high',
    title: 'Prototype pollution in board drag helper',
    scanner: 'Dependency scanning',
    location: 'package.json › sortable-tree 1.8.2',
    status: 'Confirmed',
    cve: 'CVE-2026-1142',
    detectedAt: '4d ago',
    description:
      'sortable-tree merges drop payloads with Object.assign into a shared config object, allowing __proto__ keys to pollute Object.prototype.',
  },
  {
    id: 3,
    severity: 'high',
    title: 'JWT audience not validated on CI job tokens',
    scanner: 'SAST · semgrep',
    location: 'lib/ci/job_token.rb:31',
    status: 'Needs triage',
    cve: 'CWE-287',
    detectedAt: '5d ago',
    description:
      'decode! is called with verify_aud: false, so a token minted for another project is accepted by this endpoint.',
  },
  {
    id: 4,
    severity: 'medium',
    title: 'Regex denial of service in branch filter',
    scanner: 'SAST · nodejs-scan',
    location: 'app/assets/javascripts/branch_filter.js:19',
    status: 'Dismissed',
    cve: 'CWE-1333',
    detectedAt: '1w ago',
    description:
      'The user-supplied filter is compiled without a length bound; catastrophic backtracking patterns hang the tab. Mitigated by the 256-char input cap.',
  },
  {
    id: 5,
    severity: 'medium',
    title: 'Container image runs as root',
    scanner: 'Container scanning',
    location: 'Dockerfile:1',
    status: 'Confirmed',
    cve: 'CIS-4.1',
    detectedAt: '1w ago',
    description: 'No USER directive; the runtime user is uid 0. Add a non-root user before the final stage.',
  },
  {
    id: 6,
    severity: 'low',
    title: 'Missing rel=noopener on external links',
    scanner: 'DAST',
    location: 'app/views/shared/_footer.html.haml',
    status: 'Resolved',
    cve: 'CWE-1022',
    detectedAt: '2w ago',
    description: 'External docs links opened with target=_blank without noopener; fixed in a41f9c2e.',
  },
];

/** Returns a fresh, independently-mutable copy so multiple mounted surfaces never share state. */
export function createSeedVulnerabilities() {
  return SEED_VULNERABILITIES.map((vuln) => ({ ...vuln }));
}

export function severityLabel(severity) {
  return SEVERITY_LABELS[severity] || severity;
}

export function severityColorVars(severity) {
  return SEVERITY_COLOR_VARS[severity] || SEVERITY_COLOR_VARS.low;
}

export function statusColorVars(status) {
  return STATUS_COLOR_VARS[status] || STATUS_COLOR_VARS.Dismissed;
}

/** The searchable text for one vulnerability, ported from the design's matcher() call site. */
export function vulnerabilitySearchText(vuln) {
  return `${vuln.title} ${vuln.location} ${vuln.scanner} ${vuln.cve}`;
}

/**
 * Builds a plain-text or regex matcher exactly like the design's `matcher()`:
 * empty query matches everything, regex mode compiles the query case-insensitively
 * and falls back to match-all on invalid syntax, plain mode is a case-insensitive
 * substring test.
 */
export function createMatcher(query, regexMode) {
  if (!query) return () => true;
  if (regexMode) {
    try {
      const re = new RegExp(query, 'i');
      return (text) => re.test(text);
    } catch (_error) {
      return () => true;
    }
  }
  const lowered = query.toLowerCase();
  return (text) => text.toLowerCase().includes(lowered);
}

/** Sample lines for the regex builder's corpus preview, one per vulnerability. */
export function buildRegexCorpus(vulnerabilities) {
  return vulnerabilities.map((vuln) => `${vuln.severity}  ${vuln.title}  ${vuln.location}`);
}
