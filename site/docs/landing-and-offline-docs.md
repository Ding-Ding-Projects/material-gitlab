# Landing page and offline documentation

The landing page is a responsive Material Design 3 surface with a complete local feature inventory and one bundled article for every feature. Article links resolve inside the site.

## Configuration and failure modes

The Vite build uses a relative base so assets work at a repository subpath. A missing manifest article fails the local contract check instead of disappearing silently.

## Security and verification

The built site contains no CDN scripts, remote fonts, analytics, or private vocabulary defaults. Verify 320-pixel layouts, touch targets, internal overflow, offline load, subpath load, and manifest completeness.

## Suggested articles

Read **Accessibility and responsive sizing** and **Command palette** next.
