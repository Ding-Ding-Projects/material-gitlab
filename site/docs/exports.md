# Exports

Site-owned records can be exported as JSON, JSONL, YAML, TOML, XML, CSV, TSV, Markdown, HTML, SQL, and applicable source forms without silently dropping fields.

## Configuration and failure modes

Each export identifies UTF-8 encoding, schema version, and omitted sensitive fields. A format that cannot preserve a record reports the loss before writing.

## Security and verification

Credentials, authenticator secrets, personal vocabulary, and private file metadata are excluded from ordinary exports. Verify round trips, active filters, special characters, empty sets, and omission notices.

## Suggested articles

Read **Bulk actions**, **Local history**, and **External editor handoff** next.
