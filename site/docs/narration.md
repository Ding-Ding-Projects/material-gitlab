# Narration and voice selection

Narration is off by default. Users select English, Cantonese, or serialized bilingual speech, plus a runtime voice, rate, and pitch for each language.

## Configuration and failure modes

Enable narration in Settings. Voice lists are read from the browser, refreshed after `voiceschanged`, and keep an unavailable selection while falling back. No compatible voice produces an explicit local status.

## Security and verification

Speech stays on the device and the queue replaces superseded category messages. Verify empty-then-populated enumeration, missing voices, both languages, serialization, rate and pitch bounds, cancellation, and reduced sound expectations.

## Suggested articles

Read **Language modes**, **Notifications**, and **Accessibility and responsive sizing** next.
