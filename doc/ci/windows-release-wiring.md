---
stage: Verify
group: Pipeline Authoring
description: Neutral release-record requirements for the Windows GitHub Actions packaging path.
title: Windows release wiring record
---

This page is a neutral record for the Windows release workflow. It describes the evidence a
workflow must collect; it does not claim that a release, installer, photo, or line count exists
until the workflow has produced and verified it.

## Release record template

Create one record for each workflow-produced release and fill every value from the run that built
the release:

```yaml
version: "<project version from the checked-out manifest>"
tag: "<unique monotonic tag>"
target_sha: "<full commit SHA built by this run>"
workflow:
  run_id: "<GitHub Actions run id>"
  started_at_utc: "<ISO-8601 timestamp>"
  completed_at_utc: "<ISO-8601 timestamp>"
  duration: "<HH:mm:ss measured from the first job to publication>"
installer:
  platform: windows
  packaging: squirrel-windows
  unsigned: true
  assets:
    - "<Setup.exe asset URL>"
    - "<RELEASES asset URL>"
    - "<full .nupkg asset URL>"
  sha256:
    "<asset filename>": "<digest measured from the published asset>"
dim_sum:
  dish_en: "<catalog name.en>"
  dish_zh_hant: "<catalog name.zhHant>"
  catalog_url: "https://raw.githubusercontent.com/Ding-Ding-Projects/dim-sum-photos/main/catalog/index.json"
  catalog_revision: "<catalog revision used by this run>"
  photo_asset_url: "<published catalog-v1* asset URL>"
  photo_asset_verified: false
line_count:
  command: "<committed line-counter command>"
  source: "<non-blank>/<total>"
  tests: "<non-blank>/<total>"
  styles_markup: "<non-blank>/<total>"
  grand_total: "<non-blank>/<total>"
  exclusions: "<vendored, dependency, build-output, and lockfile exclusions>"
  measured_sha: "<full commit SHA counted>"
verification:
  tag_unique: false
  target_matches_release: false
  assets_downloadable: false
  photo_decodes: false
  line_count_matches_sha: false
```

Unset booleans are intentionally false. A release note must not convert a placeholder into a
success claim without the corresponding run evidence.

## Tag uniqueness and monotonicity

Derive the tag from the checked-out project version and a monotonic workflow sequence (for
example, the workflow's run number), then verify all of the following before publication:

1. The candidate tag is not already present in the repository's release or tag inventory.
2. The candidate sequence is greater than the sequence recorded by the previous release for this
   project. If the sequence cannot be proven, stop publication and record the missing evidence.
3. The tag resolves to `target_sha`, and the release target remains that immutable commit.
4. A retry never reuses a published tag; use a new monotonic sequence value instead.

Do not substitute a timestamp, a mutable `latest` label, or a hand-edited version for the checked
sequence. Record the exact tag and target SHA in the release record.

## Windows installer evidence

The Squirrel.Windows packaging result is unsigned under the project's permanent no-signing policy.
The workflow must collect the real packaged files, not a placeholder archive: `Setup.exe`, the
`RELEASES` index, the complete `.nupkg`, and any generated delta packages declared by the packaging
configuration. For every asset, record its filename, published URL, byte size, SHA-256, and a
successful download check. State the unsigned status and the resulting unknown-publisher warning
in the release notes; do not imply authenticity or signature verification.

## Dim-sum metadata evidence

The code name is resolved from the public catalog named in the record. Use the catalog's exact
English and Traditional Chinese names and only a photo that exists in a published `catalog-v1*`
release asset. Record the catalog revision, the selected names, the public photo URL, and a decode
check. If the catalog or an unused photo cannot be resolved, leave the fields unverified and state
that the release shipped without a code name; never invent a dish or copy a photo into this
repository.

## Line-count evidence

Run the repository's committed line-counter at `measured_sha` in the same workflow that packages
the release. Publish its complete breakdown, including source, tests, styles/markup, generated
areas where applicable, exclusions, non-blank and total lines, and surviving-line attribution. Do
not hand-enter totals or count dependency directories, vendored trees, build output, or lockfiles.
The release is not line-count verified until the published table matches the counted SHA.

