# Candidate-pinned design parity runtime

`scripts/build-design-parity-runtime.ps1` prepares the local GDK runtime used for
design-parity verification. It accepts an exact Git commit and a task-owned output
directory. The helper creates a tar archive with `git archive`, expands that archive
outside the checkout, and builds only that immutable context. It therefore includes
every tracked source file even when the invoking checkout is sparse, and it does not
build a moving source directory.

```powershell
pwsh -NoProfile -File scripts/build-design-parity-runtime.ps1 `
  -Commit <40-character-commit-sha> `
  -OutputRoot C:\path\to\task-owned-output
```

The local build uses `docker buildx build --load --platform linux/amd64`, the
`qa/gdk/Dockerfile.gdk` recipe, and a local-only
`material-gitlab-parity:<commit-sha>` tag. It neither uses registry cache flags nor
publishes an image. The build arguments fix the runtime contract to
`RAILS_ENV=test`, `NODE_ENV=production`, `BABEL_ENV=production`, and
`NODE_OPTIONS=--max-old-space-size=10240`. In the absence of a CI assets-cache hash,
the recipe uses `/nonexistent/gitlab-assets-hash`, which selects asset compilation.

Each successful build retains its archive, expanded context, and `receipt.json` under
`<OutputRoot>/<commit-sha>/`. The receipt records the source SHA, archive SHA-256,
composite recipe SHA-256, local image tag, image ID and digest, repository digests when
available, context path, and completion time. It intentionally records no credentials.
Existing candidate output is refused rather than replaced.

Use `-DryRun` to validate the commit, output boundary, recipe files, tag, and exact
Docker invocation without creating an output directory or starting Docker:

```powershell
pwsh -NoProfile -File scripts/build-design-parity-runtime.ps1 `
  -Commit <40-character-commit-sha> `
  -OutputRoot C:\path\to\task-owned-output `
  -DryRun
```

Run the focused helper checks without Docker:

```powershell
pwsh -NoProfile -File scripts/tests/build-design-parity-runtime.tests.ps1
```

The helper refuses a filesystem root, any repository path or child path, an existing
Git checkout, an existing candidate directory, invalid commits, missing recipe files,
and failing archive, extraction, Docker, or inspection commands. It creates files only
inside the requested output root and never removes output from a prior candidate.
