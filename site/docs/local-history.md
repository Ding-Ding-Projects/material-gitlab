# Local history

User-managed settings and records append redacted local history events. Restores append a new event and never rewrite earlier records.

## Configuration and failure modes

History supports text, date-range, and action filters plus export. A failed history write never blocks the action the user requested and produces an honest notification.

## Security and verification

Paths, file contents, credentials, vocabulary payloads, and authenticator secrets are excluded. Verify create, update, delete, restore, filter composition, wrong credential, storage refusal, and reload.

## Suggested articles

Read **Exports**, **Changelog viewer**, and **Built-in authenticator** next.
