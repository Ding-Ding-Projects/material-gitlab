# Tabs, groups and search

Browser-style tabs dock left by default and persist order, pinned state, groups, collapse state, and membership. The site provides current-strip, per-group, group-name, and master searches, each with its own regex builder.

## Configuration and failure modes

Docking supports all four edges. Pinned tabs occupy a protected region, overflow remains reachable, and move-to-group uses a searchable picker. Invalid bulk-close patterns block the action and preserve pinned and unsaved tabs by default.

## Security and verification

Search remains local. Verify every dock, axis-aware keyboard navigation, pinning, grouping, overflow, restart persistence, all four searches, and both text-based bulk-close modes.

## Suggested articles

Read **Anchored regex builder** and **Material appearance** next.
