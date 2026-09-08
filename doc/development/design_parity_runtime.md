# Candidate-pinned design parity runtime

`scripts/build-design-parity-runtime.ps1` prepares the local GDK runtime used for
design-parity verification. It accepts an exact Git commit and a task-owned output
directory. The helper streams a tar archive from `git archive` directly to Docker's
standard-input context. It therefore preserves archive metadata such as executable
bits, avoids Windows extraction path limits, includes every tracked source file even
when the invoking checkout is sparse, and does not build a moving source directory.

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
The checked-in `qa/gdk/.tool-versions` is the build input for Gem and Node setup. Its
Ruby, Node, and Go entries are derived from `.gitlab/ci/version.yml`; focused checks
compare the two candidate-bound sources and confirm the derived manifest is present in
the Git archive sent to Docker.

Before each GDK source stage executes candidate scripts, the recipe runs
`qa/gdk/normalize-executable-shebangs.sh`. It changes only executable files whose
first line is a CRLF-terminated shebang, converting their line endings to LF. This
keeps binary files and non-executable text untouched while making a committed
`#!/usr/bin/env ruby\r\n` runnable in the Linux build context.

Each successful build retains its archive and `receipt.json` under
`<OutputRoot>/<commit-sha>/`. The receipt records the source SHA, archive SHA-256,
composite recipe SHA-256, local image tag, image configuration ID, repository manifest
digests when available, selected builder, timeout, and completion time. It intentionally
records no credentials. Existing candidate output is refused rather than replaced.

`-TimeoutSeconds` bounds the owned archive and Docker processes, defaulting to 3600
seconds. A timeout terminates only those owned process trees. `-Builder` optionally
selects a task-owned Buildx builder, so callers can set bounded parallelism without
modifying shared Docker configuration.

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
and failing archive, Docker, or inspection commands. It also refuses output roots that
contain the source Oak Kay, are a child of it, or traverse a junction or another reparse
point. It creates files only
inside the requested output root and never removes output from a prior candidate.
