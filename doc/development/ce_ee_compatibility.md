# CE/EE compatibility boundary

The shared application code exposes `GitlabEdition.edition` (also available as
`Gitlab.edition`) as descriptive registration metadata. It returns `:ce`, `:ee`, or `:jh` for
Community Edition, Enterprise Edition, and the JH distribution respectively.

This is a convenience for shared surfaces that need to identify the running distribution. It does
not replace `Gitlab.ee?`, `Gitlab.jh?`, `ee_else_ce`, or `jh_else_ee`. Existing predicates and
frontend aliases remain authoritative for conditional behavior, extension lookup, and feature
availability. In particular, a CE/EE-compatible surface should keep using `ee_else_ce` so the CE
fallback remains the module loaded when EE is absent.

JH is reported separately so code that only understands CE and EE cannot accidentally claim that
JH is CE. Callers that intentionally share the EE path may check `Gitlab.ee?`; callers that need
the exact distribution should use `Gitlab.edition` and handle all three values. No edition is
inferred from a URL, feature flag, or user-visible copy.
