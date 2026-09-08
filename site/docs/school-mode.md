# Shared focus mode

The user-renamable focus mode forces English and suppresses Cantonese, bilingual, funny-level, personal-vocabulary, and dim-sum controls across the site. Its name and state propagate through browser storage.

## Configuration and failure modes

Set a local unlock value, rename the mode, and enable it in Settings. A mismatched unlock leaves the mode active. Clearing this site’s storage is the documented reset route.

## Security and verification

This is an experience lock, not a security boundary. Only a SHA-256 verifier is stored; the entered value is not logged or exported. Verify live suppression, reload, mismatch, unlock, rename, and reset.

## Suggested articles

Read **Toy locks and Support Tickets** and **Personal vocabulary upload** next.
