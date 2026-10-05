# Deployment

This fork ships a Debian package recipe, a container image recipe, and a Docker Compose file so it
can be installed the same way stock GitLab is: `apt-get install`, `docker compose up`, or a released
container image. The full step-by-step commands live in the root
[README.md](https://github.com/Ding-Ding-Projects/material-gitlab#readme), not duplicated here.

## Configuration and failure modes

The package is built by a manually dispatched GitHub Actions workflow
(`omnibus-package.yml`) that compiles the entire Omnibus stack against this fork's source, because a
full build compiles Ruby, PostgreSQL, Redis, nginx, and the Go components from source and is too
large to run on every push. Until a run finishes and publishes, no `.deb` and no container image
exist yet; the release page is the source of truth for whether one currently does. The root
`docker-compose.yml` builds the container image locally from a release `.deb` when no published
image is pulled, and needs `GITLAB_HOSTNAME`, `GITLAB_HTTP_PORT`, `GITLAB_SSH_PORT`, and
`GITLAB_HOME` set in a local `.env` file. A missing or unpublished package is reported as a real
failure by the install commands, never silently substituted with stock upstream GitLab.

## Package output ownership

The official Omnibus builder runs as root and can leave `omnibus-gitlab/pkg` owned by root.
The next workflow step runs as the host user and must write `SHA256SUMS.txt` there. Run
[34563358622](https://github.com/Ding-Ding-Projects/material-gitlab/actions/runs/34563358622)
passed the package content checks, then failed at that checksum write with `Permission denied`.

`scripts/omnibus/build-package.sh` now captures the invoking user's numeric UID and GID. On exit,
it uses a separate run of the same builder image to change ownership only under `/omnibus/pkg`.
This includes partial output from failed builds. A build failure keeps its original exit code;
an ownership failure after a successful build makes the script fail rather than claiming usable
output. A symlinked package directory is refused, and nested symlink targets are not followed.
Neither checkout-wide nor cache-wide ownership changes are made, and file modes are not relaxed.

This behavior assumes a local, rootful Linux Docker daemon with the host UID/GID mapping used by
the Ubuntu workflow runner. Rootless, user-namespace-remapped, and remote Docker configurations
need separate validation. A terminated host or unavailable Docker daemon can prevent cleanup;
check the reported ownership error before rerunning the verifier.

Local regression commands are listed in
[BUILD.md](https://github.com/Ding-Ding-Projects/material-gitlab/blob/main/BUILD.md#building-the-omnibus-package-or-the-container-image).
`build-package.test.sh` uses mocked Docker and a real synthetic `.deb` as a non-root user. Removing
the ownership fix makes the host verifier fail at the checksum write; restoring it passes checksum
creation and replacement. Failure-status and symlink-refusal cases also pass, as do the existing
package-verifier and retry suites. These are local regression results, not evidence of a new full
Omnibus compilation, container boot, or published release.

## Security and verification

The container recipe is derived from upstream `omnibus-gitlab`'s own Docker assets (Apache-2.0,
provenance and per-file hashes recorded in `deploy/docker/UPSTREAM-NOTICE.md`) with one functional
change: it installs a locally supplied or downloaded `.deb` instead of GitLab's own package registry.
The package itself is unsigned, because code signing is disabled throughout this project; installing
it shows the same trust-the-source decision as any unsigned `.deb`. The Omnibus workflow verifies the
built package actually carries this fork's application tree and compiled frontend, and that the
musl-linked Node binaries that failed an earlier build are absent, before it is ever published.

## Running the package inside WSL on Windows

A WSL2 distro of Ubuntu 24.04 runs the same `.deb` natively, and Windows reaches it on `localhost`
through WSL2 port forwarding. [`deploy/scripts/wsl-install.sh`](https://github.com/Ding-Ding-Projects/material-gitlab/blob/main/deploy/scripts/wsl-install.sh)
downloads the release asset, verifies it against the release's `SHA256SUMS.txt`, and installs it
inside the distro in one command: `bash deploy/scripts/wsl-install.sh '<release .deb asset URL>'
http://localhost:8929`. Keep a shell open in the distro while GitLab is in use, because WSL2 stops a
distro (and GitLab with it) seconds after its last command exits; the full route, including the
memory note, is in [`deploy/README.md`](https://github.com/Ding-Ding-Projects/material-gitlab/blob/main/deploy/README.md).
This is the same package as the Docker and `.deb` routes above, so it has the same current blocker:
it needs a release that has actually published.

## The site's install card and its release manifest

The documentation site's Home page carries an **Install Material GitLab** card
(`site/index.html`, rendered by `site/src/releases.js`) that shows the exact package and image
facts for the newest published release: version, short commit SHA linked to the full commit, the
release tag linked to the release page, the `.deb` download with its size and SHA-256, the pulled
container reference with its digest, and the two-line install commands for each route. Those
commands are drawn directly from the same facts shown above them; they are not a separate,
hand-maintained copy of the README steps.

The card reads exactly one file, [`site/data/releases.json`](https://github.com/Ding-Ding-Projects/material-gitlab/blob/main/site/data/releases.json),
whose schema is documented field-by-field in
[`site/data/releases.schema.md`](https://github.com/Ding-Ding-Projects/material-gitlab/blob/main/site/data/releases.schema.md).
That file ships with an empty `entries` array, honestly, because no release has published from this
fork yet. **An entry may only be added once a human or an automated release step has verified it
against a real, non-draft, published GitHub Release** (and, for the container image, against the
image actually pushed to the registry); nothing may ever be guessed, templated, or copied from an
in-progress workflow run.

Until a verified entry exists, or whenever the manifest fails its own schema validation, the card
renders the same honest state every other unpublished surface on this site renders: a plain
sentence saying no package has published yet, and a link to the
[releases page](https://github.com/Ding-Ding-Projects/material-gitlab/releases) — never a button
that points at a guessed or constructed URL. A schema failure additionally logs the exact validation
reason to the browser console, so a broken manifest is diagnosable rather than silently swallowed.

## Suggested articles

Read **Landing page and offline documentation** and **Command palette** next.
