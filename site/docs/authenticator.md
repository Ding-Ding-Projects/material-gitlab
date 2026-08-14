# Built-in authenticator

The site accepts an `otpauth://` URI, QR image, clipboard data, camera input where available, or manual base32 parameters. It implements RFC 6238 over RFC 4226 with SHA-1, SHA-256, or SHA-512, six to eight digits, and configurable periods.

## Configuration and failure modes

Registration shows a locally rendered QR and grouped manual secret, then requires a matching current code before activation. Codes show a readable countdown and next-code preview. Clock skew is reported.

## Security and verification

Secrets remain local and are excluded from ordinary export, history, logs, captures, and telemetry. Verify published RFC vectors, QR parameters, wrong and right confirmation codes, rollover, persistence, no-network, grouping, bulk actions, and sensitive export confirmation.

## Suggested articles

Read **Toy locks and Support Tickets** and **Local history** next.
