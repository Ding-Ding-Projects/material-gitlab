# Language modes

The site stores English (`en`), the Cantonese/Traditional Chinese track (`zh-Hant`), or bilingual presentation. The Material settings model uses `yue` for the Cantonese track. The content resolver accepts both spellings without changing either storage schema.

## Implemented scope

`initProductContent` updates the eight registered search, regular-expression, and vocabulary-upload fields. Their visible labels, accessible labels, placeholders, and supporting copy follow the effective page language without replacing controls or clearing entered values. Bilingual copy shows English first and Cantonese second, with language-tagged text spans and a smaller secondary track.

The initializer reads the page's effective `data-language` on first render and observes subsequent changes, including scheduled overrides. It temporarily renders these fields in English while `data-school-mode` is true, without writing saved preferences. Leaving the override restores the effective page choice. Late-mounted registered fields are also initialized. Repeated initialization is idempotent, and the returned controller has a `dispose()` method.

`createTextField` also exposes `setLanguage()`. Its caller owns the selected language. Factory-created error messages use the requested language from the first render.

## Boundaries and remaining work

This is not full-application localization. Static site headings and many dynamically generated dialogs, statuses, options, and tool labels are still hard-coded. The live GitLab Vue surfaces, including project Settings, and both desktop applications still need a complete string inventory and integration review. These fixes do not implement all five tone variants, cross-tab preference synchronization, or complete Focus-mode suppression across every surface.

Only registered product copy is translated. Commands, URLs, identifiers, entered values, external records, and feature-provided error text remain literal. Existing `aria-describedby` links and invalid states are preserved; generated description IDs are unique. Catalog content is rendered through text nodes, never HTML.

## Verification

Run the focused source tests from the repository root:

```sh
node --test site/tests/localization.test.mjs
```

For the standalone browser regression fixture, serve the site directory locally and open `tests/fixtures/localization.html`. It reports 34 checks and uses an isolated storage adapter so it never alters a user's saved preferences.

Local validation on 2026-09-18 passed 18 source tests, including 75 independent language/level persistence combinations. The 34 fixture checks passed in Chromium 144 at 1280, 375, and 320 pixel widths. Additional keyboard tab-order and 200% text-size checks passed without horizontal page overflow. Browser navigation was restricted in that environment, so the fixture ran as offline DOM content with equivalent local module data URLs, not as a deployed or bundled application.

The full site build, full repository suite, live Rails integration, desktop packaging, and end-to-end language coverage are not verified by those results. Before declaring full GUI coverage, verify every navigation item, setting, dialog, option, error, status, reload, Focus transition, and narrow layout in all three modes in the actual applications.

## Suggested articles

Read **Independent funny levels**, **Personal vocabulary upload**, and **Accessibility and responsive sizing** next.
