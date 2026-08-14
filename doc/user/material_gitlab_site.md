# Material GitLab documentation site

The repository includes a static Material Design 3 documentation site in `site/`. It is designed for repository-subpath hosting and keeps visitor-managed state in browser storage.

## Build and verify the site

From `site/`, run:

```shell
npm ci
npm test
npm run build
```

The build empties `site/dist`, emits relative asset references, and bundles the hand-written feature inventory, localization catalog, offline Markdown articles, and project logo presets. The build fails when a required article, inventory row, evidence record, or interaction contract is missing.

## Universal surfaces

The site provides persisted language and tone controls, an emoji preference, a renameable local focus mode, narrator voice selection, scheduled settings, anchored regular-expression builders, non-blocking notifications, Material appearance editing, browser-style tabs, a command palette, destructive-action confirmation, local history, changelog and export tools, bulk actions, personal-vocabulary upload, local logo conversion, a categorized file-converter registry, local Ollama recovery tools, per-element toy locks, a local authenticator, download start/progress/completion surfaces, and a Status Hub card.

Every search, dropdown, and context menu owns a local plain-text filter plus an adjacent regular-expression builder. The page remains usable at narrow widths, overlays paint an opaque surface and scroll internally, and visitor state stays local.

## Privacy and security boundaries

- No private vocabulary mapping is bundled. The site applies a vocabulary only after a complete user-selected JSON payload passes the bounded schema.
- Personal vocabulary, credentials, authenticator secrets, local file content, and custom-logo bytes are excluded from ordinary exports, local history, diagnostics, and captures.
- The browser-only Ollama surface cannot claim that a local service operation succeeded until its bounded loopback adapter returns a validated response.
- Toy locks and the focus mode are experience controls, not security boundaries. Clearing site storage is the documented reset route.
- The browser download flow is a working browser equivalent. Installed-extension provenance is a separate release proof and is never inferred from the site-only flow.

## Failure modes

Unavailable storage falls back to shipped values for the current visit. Invalid regular expressions stay visible and do not run. Missing speech voices, Ollama transport, converter adapters, and local-editor launch capability remain visible with exact explanations. Failed logo conversion retains the previous valid mark.

## Verification evidence

`site/data/completeness-inventory.json` is the hand-written per-feature inventory. `site/scripts/completeness-gate.mjs` checks exact feature coverage, evidence dimensions, real paths, implemented state, and verified capture records. `site/scripts/site-contract-gate.mjs` checks the interactive source markers, bundled articles, locale modes, local asset policy, and repository-subpath output. The real built-site capture manifest is stored under `site/evidence/` and records its commit and capture route.

## Related topics

- [Search](search/_index.md)
- [Keyboard shortcuts](shortcuts.md)
- [Accessibility](../development/accessibility/_index.md)
