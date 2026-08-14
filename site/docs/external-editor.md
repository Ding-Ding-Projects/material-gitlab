# External editor handoff

The static site downloads a complete UTF-8 export that can be opened in Visual Studio Code and provides an explicit Visual Studio Code for the Web route. It does not pretend that a browser can discover or launch a local executable.

## Configuration and failure modes

Export first, then open the downloaded file or folder in the editor. If browser protocol handling is unavailable, the downloaded artifact remains usable.

## Security and verification

Exports omit credentials and private vocabulary. Verify file contents, encoding, omission disclosure, editor link, and the unsupported local-launch explanation.

## Suggested articles

Read **Exports** and **Universal file converter** next.
