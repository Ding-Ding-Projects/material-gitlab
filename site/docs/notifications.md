# Notifications

Informational, success, progress, and non-decision error messages use non-blocking corner notifications. Warnings and errors persist until dismissed, and all items remain reviewable in the notification centre.

## Configuration and failure modes

Notifications stack without overlap and expose local bulk dismiss and redacted export. Storage refusal keeps the current message visible without claiming persistence.

## Security and verification

Notification exports omit callbacks and private payloads. Verify stacking, timeouts, persistent errors, keyboard dismissal, screen-reader announcements, bulk actions, history, and narrow layouts.

## Suggested articles

Read **Bulk actions** and **Exports** next.
