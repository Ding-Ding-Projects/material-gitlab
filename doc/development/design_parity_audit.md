# Design parity audit, 8 September 2026

This task implements the 25 checked-in design contracts. Additional findings are
recorded and prioritized without automatically expanding the repair scope.

## Evidence baseline

The initial source revision was `af8084bc46b1ced8a216941567283475f1393191`.
The current development computer had no running GitLab service at loopback port
8929. Registered WSL distributions did not establish that GitLab was installed.
The existing GDK Dockerfile provides the candidate-bound Rails build route;
the desktop installers themselves are configuration and planning tools.

The dedicated reference application was launched on an isolated hidden desktop.
The Admin reference rendered at a measured 1280 by 800 CSS pixels. Its original
font set contained only Material Symbols Outlined, despite requesting Google
Sans and Google Sans Text. That capture is diagnostic evidence, not an approved
parity baseline.

## Additional findings

| Priority | Finding | Verified evidence | Scope |
| --- | --- | --- | --- |
| High | Omnibus packaging fails its native dependency health check. | [Run 34239883194](https://github.com/Ding-Ding-Projects/material-gitlab/actions/runs/34239883194) ends with unresolved `libc.musl-x86_64.so.1` for frontend native packages, exit 1, and no `.deb` output. | Record separately. The parity runtime uses the existing GDK recipe. |
| Medium | Instant permanently disables two navigation items with a promise that verification will enable them. | At the baseline, `src/renderer/app.ts` renders both Deployment plan and Activity disabled with `Available after verification`; no subsequent render enables them. | Audit only; not reproduced in a packaged application on this computer. |
| Medium | Consecutive releases reuse package version 0.1.0. | Releases `windows-93-c5a962dff722` and `windows-94-af8084bc46b1` both list 0.1.0 full packages for both desktop tools. | Version reuse confirmed; installed update behavior remains unverified. |
| Medium | Historical handoff text says no release has been published. | Release `windows-94-af8084bc46b1` is non-draft, targets the baseline SHA, and lists both Squirrel installer sets. | Correct the handoff during task closeout. |
| Low | Instant documentation describes a mutable icon URL as immutable. | The configured URL follows `main`. | Corrected together with a publication-wording violation in the same sentence. |

The Deployer label `Ready for local review` is not evidence of a claim that the
runtime is ready. Its missing renderer bridge for other lifecycle operations is
not accepted as a confirmed defect without a specific behavior requirement or
reproduction.

## Completion boundary

An exact-source review at `007ab7cf36280d00e9f31b876845e45bfc349d42` found a
blocking component-conformance gap. Surface Vue files contain 427 native-button
lines, 151 native-input lines, 6 native-select lines, and 14 native-textarea
lines. Those are source counts, not counts of controls simultaneously visible.
The feature registry and route inventory do not provide rendered component
provenance. Styled native controls and accessibility attributes alone cannot
establish the required genuine Material Design 3 component implementation.
The first repair lane establishes an official component package and migrates the
two shared headers. Remaining surfaces require their own conversion and review;
the pending component audits must not be marked complete from that first lane.

The same review found that the actual Agent Memory route exposes a sync action
whose component has no `runSync` method. Dormant skill, session, and history
actions also simulate backend success locally. The current controller returns
empty collections and supplies no matching mutation endpoints. Their repair
must expose honest capability availability rather than invent a working sync
or accept a timer as backend evidence.

Route inventory checks, unit tests, successful compilation, and a working
reference renderer do not establish production parity. Each contract still needs
real production interaction, matching tuples, current provenance, raw captures,
reviewed comparisons and diffs, and explicit resolution of every visual gap.
