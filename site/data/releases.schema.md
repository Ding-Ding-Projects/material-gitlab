# `releases.json` schema

This file is the **only** source of truth the Home page install card reads from. The card
(`site/src/releases.js`, wired in `site/src/main.js`) never constructs a download URL, a commit
link, or an image reference on its own. It renders exactly what this file states, and it renders
the honest empty state whenever this file has no verified entry to show.

## The rule this file exists to enforce

**An entry may be added to `entries` only after a human, or a verified release step, has confirmed
every field against a real, published, non-draft GitHub Release** — and, for a `container-image`
entry, against the container image actually pushed to the registry. No entry may be constructed
from a guess, a template, an in-progress workflow run, or a release that has not finished
publishing. When no verified release exists yet, `entries` stays `[]` and the card shows:

> No package has been published yet; the first build is in progress. Watch the releases page.

with a link to <https://github.com/Ding-Ding-Projects/material-gitlab/releases>. That is the
correct, complete state of this file today — the Omnibus workflow
(`.github/workflows/omnibus-package.yml`) has not yet published a release from this fork as this
schema is being written.

## Top-level fields

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaVersion` | integer | yes | Always `1` for this shape. A consumer must refuse a manifest with any other value rather than guess at a newer or older shape. |
| `updatedAt` | string | yes | ISO-8601 UTC timestamp of the last time **this file** was edited. This is bookkeeping about the manifest, not a release date; each entry carries its own `verified.at` for that. |
| `entries` | array | yes | Zero or more entry objects, described below. Empty is the honest default. |

Entries are listed **newest first**. The card renders the first `omnibus-package` entry and the
first `container-image` entry it finds; it does not merge or average across several entries of the
same kind. A retired or superseded release stays in the array (for history / audit) further down
the list rather than being deleted, but only the newest of each kind is ever shown.

## Entry fields (both kinds)

| Field | Type | Meaning |
| --- | --- | --- |
| `kind` | `"omnibus-package"` \| `"container-image"` | Which install route this entry describes. |
| `version` | string | The GitLab Omnibus version this release packaged, read from the repository's `VERSION` file at build time (for example `19.3.0-pre`). |
| `commit` | string | The **full 40-character** lowercase hex commit SHA that was packaged (`git rev-parse HEAD` in the workflow). The card derives the displayed short SHA from this field; it is never stored separately, so there is only one place a commit identity can drift from the truth. |
| `tag` | string | The exact GitHub release tag, `omnibus-<version>-<sha12>` (for example `omnibus-19.3.0-pre-abcdef012345`), where `<sha12>` is the first 12 characters of `commit`. |
| `releaseUrl` | string | The full `https://github.com/Ding-Ding-Projects/material-gitlab/releases/tag/<tag>` URL for this exact release. Must resolve to a real, non-draft release. |
| `assets` | array | Downloadable files attached to that GitHub Release relevant to this entry (see below). May be empty for a `container-image` entry. |
| `image` | object \| `null` | `null` for `omnibus-package`. Required object for `container-image` (see below). |
| `verified` | object | Who or what confirmed this row is accurate, and how (see below). |

### `assets[]` (used by `omnibus-package`; optional for `container-image`)

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | string | The exact asset filename as attached to the release, for example `gitlab-ce_19.3.0-pre_amd64.deb`. |
| `url` | string | The exact `https://github.com/.../releases/download/<tag>/<name>` asset URL. Must be `https://`. |
| `sha256` | string | 64 lowercase hex characters, copied from the release's `SHA256SUMS.txt`. |
| `bytes` | integer | Exact file size in bytes, copied from the release asset metadata. |

An `omnibus-package` entry must include at least one asset whose `name` ends in `.deb`; that is the
asset the card offers as the package download and shows the two-line install commands for.

### `image` (required for `container-image`, must be `null` otherwise)

| Field | Type | Meaning |
| --- | --- | --- |
| `reference` | string | The pullable, tagged reference, for example `ghcr.io/ding-ding-projects/material-gitlab:19.3.0-pre-abcdef012345`. This is the workflow's `image_ref` output. |
| `digest` | string | The full repository digest as reported by `docker inspect --format '{{index .RepoDigests 0}}'` after a verified push, for example `ghcr.io/ding-ding-projects/material-gitlab@sha256:<64 hex characters>`. Must end in `@sha256:` followed by 64 lowercase hex characters. |

### `verified`

| Field | Type | Meaning |
| --- | --- | --- |
| `by` | string | Who or what confirmed this entry, for example a GitHub Actions run URL, or a maintainer's name for a manual check. |
| `at` | string | ISO-8601 timestamp of when the verification happened. |
| `method` | string | A short, concrete description of what was actually checked, for example `"gh release view --json assets,isDraft,targetCommitish; sha256sum -c on the downloaded asset"`. A method that only says "looked at it" is not enough detail for the next person to reproduce the check. |

## Worked example (not currently in `releases.json`; shown for reference only)

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-09-09T01:27:57Z",
  "entries": [
    {
      "kind": "omnibus-package",
      "version": "19.3.0-pre",
      "commit": "abcdef0123456789abcdef0123456789abcdef01",
      "tag": "omnibus-19.3.0-pre-abcdef012345",
      "releaseUrl": "https://github.com/Ding-Ding-Projects/material-gitlab/releases/tag/omnibus-19.3.0-pre-abcdef012345",
      "assets": [
        {
          "name": "gitlab-ce_19.3.0-pre_amd64.deb",
          "url": "https://github.com/Ding-Ding-Projects/material-gitlab/releases/download/omnibus-19.3.0-pre-abcdef012345/gitlab-ce_19.3.0-pre_amd64.deb",
          "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          "bytes": 432000000
        }
      ],
      "image": null,
      "verified": {
        "by": "https://github.com/Ding-Ding-Projects/material-gitlab/actions/runs/00000000000",
        "at": "2026-09-09T01:00:00Z",
        "method": "gh release view --json isDraft,targetCommitish,assets; sha256sum -c against the published SHA256SUMS.txt"
      }
    },
    {
      "kind": "container-image",
      "version": "19.3.0-pre",
      "commit": "abcdef0123456789abcdef0123456789abcdef01",
      "tag": "omnibus-19.3.0-pre-abcdef012345",
      "releaseUrl": "https://github.com/Ding-Ding-Projects/material-gitlab/releases/tag/omnibus-19.3.0-pre-abcdef012345",
      "assets": [],
      "image": {
        "reference": "ghcr.io/ding-ding-projects/material-gitlab:19.3.0-pre-abcdef012345",
        "digest": "ghcr.io/ding-ding-projects/material-gitlab@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      },
      "verified": {
        "by": "https://github.com/Ding-Ding-Projects/material-gitlab/actions/runs/00000000000",
        "at": "2026-09-09T01:05:00Z",
        "method": "docker pull by digest; boot check against the running container's sign-in page"
      }
    }
  ]
}
```

## What consumes this file

`site/src/releases.js` exports `validateReleaseManifest(raw)`, which re-checks every rule above at
render time rather than trusting that a hand-edited or script-written file is correct. Any
violation — wrong `schemaVersion`, a non-`https` URL, a `sha256` that is not 64 hex characters, a
missing `.deb` asset, a malformed digest, and so on — fails the whole manifest closed: the card
falls back to the same honest, no-download-control state it uses when `entries` is empty, and the
exact validation reason is logged to the browser console so the mistake can be found and fixed. It
never renders a partially-valid card, and it never guesses a missing field.
