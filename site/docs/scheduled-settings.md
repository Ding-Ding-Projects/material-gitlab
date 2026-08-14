# Scheduled and external settings

Versioned local rules can override language, theme, density, and accent during bounded date, time, and weekday windows. Base preferences remain intact when a rule stops matching.

## Configuration and failure modes

Rules use the browser’s local timezone and deterministic order. External sources are represented only through bounded, validated adapters; offline or malformed responses retain the last valid local state.

## Security and verification

Credentials are never stored in schedule records. Verify cross-midnight rules, selected weekdays, equal times, invalid partial input, precedence, offline behavior, persistence, and cancellation of stale responses.

## Suggested articles

Read **Language modes** and **Material appearance** next.
