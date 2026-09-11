/**
 * Release install manifest: validation, selection, formatting, and pure
 * HTML rendering for the Home page "Install Material GitLab" card.
 *
 * The card never fabricates a release URL, a download link, or an image
 * digest. It renders only what a committed, schema-validated manifest
 * (site/data/releases.json, documented in site/data/releases.schema.md)
 * states, and it fails closed to an honest empty state whenever the
 * manifest is missing an entry or fails validation. This module owns no
 * network access and no DOM access, so it is exercised directly by
 * site/tests/site.test.mjs the same way every other pure module here is.
 */

export const RELEASES_SCHEMA_VERSION = 1;
export const RELEASES_PAGE_URL = 'https://github.com/Ding-Ding-Projects/material-gitlab/releases';
export const REPOSITORY_COMMIT_URL = 'https://github.com/Ding-Ding-Projects/material-gitlab/commit/';

export const EMPTY_INSTALL_MESSAGE =
  'No package has been published yet; the first build is in progress. Watch the releases page.';
export const INVALID_MANIFEST_MESSAGE =
  'The install information could not be read from the release manifest. Watch the releases page for updates.';

const KINDS = Object.freeze(['omnibus-package', 'container-image']);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const IMAGE_DIGEST_PATTERN = /@sha256:[0-9a-f]{64}$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpsUrl(value) {
  return typeof value === 'string' && /^https:\/\//.test(value);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isIsoTimestamp(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function validateAsset(asset, where, problems) {
  if (!asset || typeof asset !== 'object') {
    problems.push(`${where} must be an object`);
    return;
  }
  if (!isNonEmptyString(asset.name)) problems.push(`${where}.name must be a non-empty string`);
  if (!isHttpsUrl(asset.url)) problems.push(`${where}.url must be an https URL`);
  if (typeof asset.sha256 !== 'string' || !SHA256_PATTERN.test(asset.sha256)) {
    problems.push(`${where}.sha256 must be 64 lowercase hex characters`);
  }
  if (!isPositiveInteger(asset.bytes)) problems.push(`${where}.bytes must be a positive integer`);
}

function validateVerified(verified, where, problems) {
  if (!verified || typeof verified !== 'object') {
    problems.push(`${where} must be an object`);
    return;
  }
  if (!isNonEmptyString(verified.by)) problems.push(`${where}.by must be a non-empty string`);
  if (!isIsoTimestamp(verified.at)) problems.push(`${where}.at must be a parseable ISO-8601 timestamp`);
  if (!isNonEmptyString(verified.method)) problems.push(`${where}.method must be a non-empty string`);
}

function validateEntry(entry, index, problems) {
  const where = `entries[${index}]`;
  if (!entry || typeof entry !== 'object') {
    problems.push(`${where} must be an object`);
    return;
  }
  if (!KINDS.includes(entry.kind)) {
    problems.push(`${where}.kind must be one of ${KINDS.join(', ')}`);
    return;
  }
  if (!isNonEmptyString(entry.version)) problems.push(`${where}.version must be a non-empty string`);
  if (typeof entry.commit !== 'string' || !COMMIT_PATTERN.test(entry.commit)) {
    problems.push(`${where}.commit must be a 40-character lowercase hex commit SHA`);
  }
  if (!isNonEmptyString(entry.tag)) problems.push(`${where}.tag must be a non-empty string`);
  if (!isHttpsUrl(entry.releaseUrl) || !entry.releaseUrl.startsWith(RELEASES_PAGE_URL)) {
    problems.push(`${where}.releaseUrl must be an https URL under ${RELEASES_PAGE_URL}`);
  }
  if (!Array.isArray(entry.assets)) {
    problems.push(`${where}.assets must be an array`);
  } else {
    entry.assets.forEach((asset, assetIndex) => validateAsset(asset, `${where}.assets[${assetIndex}]`, problems));
  }
  validateVerified(entry.verified, `${where}.verified`, problems);

  if (entry.kind === 'omnibus-package') {
    if (entry.image !== null) problems.push(`${where}.image must be null for an omnibus-package entry`);
    if (Array.isArray(entry.assets) && !entry.assets.some((asset) => asset && typeof asset.name === 'string' && asset.name.endsWith('.deb'))) {
      problems.push(`${where}.assets must include one asset whose name ends with .deb`);
    }
  }
  if (entry.kind === 'container-image') {
    if (!entry.image || typeof entry.image !== 'object') {
      problems.push(`${where}.image is required for a container-image entry`);
    } else {
      if (!isNonEmptyString(entry.image.reference)) problems.push(`${where}.image.reference must be a non-empty string`);
      if (typeof entry.image.digest !== 'string' || !IMAGE_DIGEST_PATTERN.test(entry.image.digest)) {
        problems.push(`${where}.image.digest must end with @sha256:<64 hex characters>`);
      }
    }
  }
}

/**
 * Validate a raw, freshly-fetched-and-parsed manifest against the documented
 * schema (site/data/releases.schema.md). Returns { ok: true, manifest } on
 * success or { ok: false, reason } naming every problem found, joined into
 * one string so a caller can log or display it without inspecting an array.
 *
 * This never throws: a malformed manifest is business-as-usual input from
 * the caller's point of view, not an exceptional condition.
 */
export function validateReleaseManifest(raw) {
  const problems = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'manifest root must be a JSON object' };
  }
  if (raw.schemaVersion !== RELEASES_SCHEMA_VERSION) {
    return { ok: false, reason: `unsupported schemaVersion ${JSON.stringify(raw.schemaVersion)}` };
  }
  if (!isIsoTimestamp(raw.updatedAt)) problems.push('updatedAt must be a non-empty ISO-8601 timestamp');
  if (!Array.isArray(raw.entries)) {
    problems.push('entries must be an array');
  } else {
    raw.entries.forEach((entry, index) => validateEntry(entry, index, problems));
  }
  if (problems.length) return { ok: false, reason: problems.join('; ') };
  return { ok: true, manifest: { schemaVersion: raw.schemaVersion, updatedAt: raw.updatedAt, entries: raw.entries } };
}

/**
 * Entries are stored newest first. The card shows the first entry of each
 * kind rather than merging or averaging across a release history.
 */
export function selectEntries(manifest) {
  const entries = manifest?.entries ?? [];
  return {
    packageEntry: entries.find((entry) => entry.kind === 'omnibus-package') || null,
    imageEntry: entries.find((entry) => entry.kind === 'container-image') || null,
  };
}

export function findDebAsset(entry) {
  return entry?.assets?.find((asset) => typeof asset?.name === 'string' && asset.name.endsWith('.deb')) || null;
}

export function shortCommit(commit) {
  return String(commit || '').slice(0, 12);
}

/** Decimal (1000-based) byte formatting, matching how transfer sizes are usually quoted. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown size';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  const decimals = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Two-line commands mirroring README step 2 ("Install the .deb on Debian or
 * Ubuntu"): download the exact published asset, then install it. The
 * SHA-256 verification line is shown separately as a labelled field on the
 * card rather than folded into this snippet, so the two stay independently
 * readable and copyable.
 */
export function buildPackageCommands(packageEntry) {
  const asset = findDebAsset(packageEntry);
  if (!asset) return [];
  return [
    `curl -fLo ${asset.name} '${asset.url}'`,
    `sudo EXTERNAL_URL="https://gitlab.example.internal" dpkg -i ${asset.name}`,
  ];
}

/**
 * Two-line commands mirroring README step 1 ("Install with Docker"): pull
 * the exact published tag, then bring it up with the repository's own
 * docker-compose.yml (see the deployment article for the required .env).
 */
export function buildDockerCommands(imageEntry) {
  if (!imageEntry?.image?.reference) return [];
  return [
    `docker pull ${imageEntry.image.reference}`,
    'docker compose up -d',
  ];
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function metaRow(label, valueHtml) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd></div>`;
}

function commandsBlock(lines) {
  if (!lines.length) return '';
  return `<pre class="install-commands"><code>${lines.map(escapeHtml).join('\n')}</code></pre>`;
}

function commitLink(commit) {
  const url = `${REPOSITORY_COMMIT_URL}${commit}`;
  return `<a href="${escapeHtml(url)}">${escapeHtml(shortCommit(commit))}</a>`;
}

function renderPackageEntry(entry) {
  const asset = findDebAsset(entry);
  const rows = [
    metaRow('Version', escapeHtml(entry.version)),
    metaRow('Commit', commitLink(entry.commit)),
    metaRow('Release', `<a href="${escapeHtml(entry.releaseUrl)}">${escapeHtml(entry.tag)}</a>`),
    metaRow(
      'Package',
      asset
        ? `<a class="button button-tonal" data-install-download href="${escapeHtml(asset.url)}">${escapeHtml(asset.name)}</a> <span class="install-size">${escapeHtml(formatBytes(asset.bytes))}</span>`
        : '<span>No package asset recorded.</span>',
    ),
    metaRow('SHA-256', asset ? `<code data-install-sha256>${escapeHtml(asset.sha256)}</code>` : '<code>unavailable</code>'),
  ].join('');
  const commands = commandsBlock(buildPackageCommands(entry));
  return `<article class="surface-card install-entry" data-install-entry="package"><h3>Debian/Ubuntu package</h3><dl class="install-meta">${rows}</dl>${commands}</article>`;
}

function renderImageEntry(entry) {
  const rows = [
    metaRow('Version', escapeHtml(entry.version)),
    metaRow('Commit', commitLink(entry.commit)),
    metaRow('Release', `<a href="${escapeHtml(entry.releaseUrl)}">${escapeHtml(entry.tag)}</a>`),
    metaRow('Image', `<code data-install-image-ref>${escapeHtml(entry.image.reference)}</code>`),
    metaRow('Digest', `<code data-install-digest>${escapeHtml(entry.image.digest)}</code>`),
  ].join('');
  const commands = commandsBlock(buildDockerCommands(entry));
  return `<article class="surface-card install-entry" data-install-entry="image"><h3>Container image</h3><dl class="install-meta">${rows}</dl>${commands}</article>`;
}

function emptyStateMarkup(message, state) {
  return `<div class="surface-card install-empty" data-install-state="${escapeHtml(state)}"><p data-install-status role="status">${escapeHtml(message)}</p><a class="text-link" data-install-releases-link href="${escapeHtml(RELEASES_PAGE_URL)}">Watch the releases page <span aria-hidden="true">→</span></a></div>`;
}

/**
 * Render the install card's inner markup from a raw (already JSON.parse'd)
 * manifest. Always returns { ok, reason, html }:
 *
 *  - ok is false when the manifest itself failed schema validation (a bug
 *    in whatever wrote the file, or a fetch that returned something else
 *    entirely). html still falls back to a no-download-control state in
 *    this case, but with distinct copy from the "legitimately no release
 *    yet" state, so a maintainer reading the console warning this triggers
 *    (see main.js) is not told a false story about the project having no
 *    release when the real problem is a broken manifest file.
 *  - ok is true and reason is null whenever the manifest is well-formed,
 *    whether or not it has any entries.
 *
 * Neither branch ever renders a link or button whose href was invented by
 * this function; every href in the "available" branch is copied verbatim
 * from the validated manifest.
 */
export function renderReleaseCard(rawManifest) {
  const validated = validateReleaseManifest(rawManifest);
  if (!validated.ok) {
    return { ok: false, reason: validated.reason, html: emptyStateMarkup(INVALID_MANIFEST_MESSAGE, 'invalid') };
  }

  const { packageEntry, imageEntry } = selectEntries(validated.manifest);
  if (!packageEntry && !imageEntry) {
    return { ok: true, reason: null, html: emptyStateMarkup(EMPTY_INSTALL_MESSAGE, 'empty') };
  }

  const cards = [
    packageEntry ? renderPackageEntry(packageEntry) : '',
    imageEntry ? renderImageEntry(imageEntry) : '',
  ].filter(Boolean).join('');
  const updatedAt = escapeHtml(validated.manifest.updatedAt);
  const updated = `<p class="install-updated" data-install-updated>Manifest last updated <time datetime="${updatedAt}">${updatedAt}</time>. <a class="text-link" href="${escapeHtml(RELEASES_PAGE_URL)}">See every release</a>.</p>`;
  return { ok: true, reason: null, html: `<div class="tool-grid" data-install-state="available">${cards}</div>${updated}` };
}
