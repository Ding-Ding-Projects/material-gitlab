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

## Security and verification

The container recipe is derived from upstream `omnibus-gitlab`'s own Docker assets (Apache-2.0,
provenance and per-file hashes recorded in `deploy/docker/UPSTREAM-NOTICE.md`) with one functional
change: it installs a locally supplied or downloaded `.deb` instead of GitLab's own package registry.
The package itself is unsigned, because code signing is disabled throughout this project; installing
it shows the same trust-the-source decision as any unsigned `.deb`. The Omnibus workflow verifies the
built package actually carries this fork's application tree and compiled frontend, and that the
musl-linked Node binaries that failed an earlier build are absent, before it is ever published.

## Suggested articles

Read **Landing page and offline documentation** and **Command palette** next.
