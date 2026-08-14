# Anchored regex builder

Every search, menu filter, and picker filter keeps plain text as the default and owns an adjacent ECMAScript regex builder with pattern, flags, sample text, live matches, captures, copy, and export.

## Configuration and failure modes

Open the builder beside its field. Invalid patterns remain visible with inline feedback and do not run. Evaluation bounds pattern, sample, and match counts and advances safely over zero-width matches.

## Security and verification

Patterns remain local. Verify literal, Unicode, multiline, invalid, no-match, capture-group, zero-width, adversarial, and independent-field cases.

## Suggested articles

Read **Tabs, groups and search** and **Command palette** next.
