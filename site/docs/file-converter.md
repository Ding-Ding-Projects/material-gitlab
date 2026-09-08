# Universal file converter

The local converter groups adapters under Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text, and Binary Encodings. Each category has its own search and regex builder.

## Configuration and failure modes

Enabled adapters are bundled and work offline; known unavailable formats stay visible with the exact missing component. Type detection reads bounded bytes, queues use bounded concurrency, and outputs are validated before download.

## Security and verification

The source remains unchanged and conversion has no ambient network access. Verify every category, unavailable adapters, signatures, loss disclosure, atomic output, cancellation, partial batches, persistent queue recovery, storage preflight, and constant-memory behavior.

## Suggested articles

Read **Exports** and **External editor handoff** next.
