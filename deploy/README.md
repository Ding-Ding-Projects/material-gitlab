# `deploy/`

Everything needed to run this fork, or to run stock upstream GitLab as a comparison baseline, as a
container. Step-by-step install instructions live in the root [README.md](../README.md); this file
is a short index of what is under this directory and why.

| Path | What it is |
| --- | --- |
| [`docker/`](docker/) | The container image recipe for **this fork**. Installs the `.deb` built by [`omnibus-package.yml`](../.github/workflows/omnibus-package.yml) into the official Omnibus container layout. |
| [`upstream-baseline/`](upstream-baseline/) | A Compose file for **stock upstream** `gitlab/gitlab-ce`. Runs the product this fork exists to replace, kept only as a comparison baseline for design parity. |
| [`scripts/remote-up.sh`](scripts/remote-up.sh) | One command that copies the Compose file and image recipe to a remote Docker host over SSH, builds or pulls the image, starts the container and waits for its health check. |
| [`scripts/wsl-install.sh`](scripts/wsl-install.sh) | Installs the `.deb` natively inside a WSL Ubuntu 24.04 distro on Windows, the route used here for local verification. |

The `.env` keys the root [`docker-compose.yml`](../docker-compose.yml) reads are listed in the root
README's **Install with Docker** section. `GITLAB_CPU_LIMIT` (default `4`) caps the container to that
many CPU cores, the same way `GITLAB_MEMORY_LIMIT` caps its memory, so a shared host stays
responsive; raise it on a dedicated host with cores to spare.

## Running the package in WSL on Windows

The package is a Debian package for Ubuntu 24.04, and a WSL2 distro of that release runs it
natively. Windows reaches the instance on `localhost` through WSL2 port forwarding, so the
default `EXTERNAL_URL` is `http://localhost:8929`.

```powershell
# On Windows: a fresh 24.04 distro (any name; this one matches the project)
wsl --install Ubuntu-24.04 --name material-gitlab --no-launch
wsl -d material-gitlab -u root -- bash
```

```bash
# Inside the distro, as root: install straight from the release asset
bash deploy/scripts/wsl-install.sh \
  https://github.com/Ding-Ding-Projects/material-gitlab/releases/download/<tag>/<package>.deb \
  http://localhost:8929 /root/material-gitlab/root_password
```

Two WSL2 facts decide whether this works:

- **The distro stops when its last command exits**, taking GitLab with it. Keep a shell open
  inside the distro, or run `wsl -d material-gitlab -- sleep infinity` from Windows, for as long
  as the instance must stay up. A browser that gets `connection refused` seconds after `curl`
  answered was almost certainly talking to a distro that had just shut down.
- **Memory is capped by `.wslconfig`**, not by the host. GitLab needs about 6 GB to be
  comfortable; check `free -g` inside the distro before blaming the package.

The password file is optional. Without it the package writes a generated password to
`/etc/gitlab/initial_root_password` and deletes that file after 24 hours.

The root [`docker-compose.yml`](../docker-compose.yml) builds and runs `deploy/docker/`; it is the
one to use for actually running this fork. See README.md, section **Install with Docker**, for the
full steps.

## `docker/`

- [`Dockerfile`](docker/Dockerfile) — derived from `omnibus-gitlab`'s own `docker/Dockerfile` at
  `19.3.0+ce.0` (Apache-2.0; see [`UPSTREAM-NOTICE.md`](docker/UPSTREAM-NOTICE.md) for the exact
  upstream hashes and the local changes). It installs a `.deb` built from this fork rather than
  downloading stock upstream's package.
- [`assets/`](docker/assets/) — the Omnibus container's own setup, init, and sshd scripts, copied
  from upstream unchanged except for `assets/setup` (see the notice file for the one line of local
  change: prefer a local package over a network download).
- [`packages/`](docker/packages/) — build input only, and gitignored. Drop a `.deb` here to build
  the image with no network access, or pass `--build-arg DOWNLOAD_URL=<release asset URL>` instead.
- [`UPSTREAM-NOTICE.md`](docker/UPSTREAM-NOTICE.md) and
  [`UPSTREAM-LICENSE-Apache-2.0.txt`](docker/UPSTREAM-LICENSE-Apache-2.0.txt) — the license and
  per-file provenance for the copied upstream Omnibus container files.

### Local build, without Docker Compose

```bash
# Option A: build from a release asset URL, no local file needed
docker build --build-arg RELEASE_VERSION=<version>-<sha12> \
  --build-arg DOWNLOAD_URL=<release .deb URL> -t material-gitlab:local deploy/docker

# Option B: build from a .deb you already downloaded, fully offline
cp gitlab-ce_*.deb deploy/docker/packages/
docker build --build-arg RELEASE_VERSION=<version>-<sha12> -t material-gitlab:local deploy/docker
```

Building the package itself (the `.deb` these commands consume) is not part of this directory; see
[`scripts/omnibus/`](../scripts/omnibus/) and the root README's **Build the package yourself**
section.

## `upstream-baseline/`

[`docker-compose.yml`](upstream-baseline/docker-compose.yml) runs the official `gitlab/gitlab-ce`
image with no modification from this fork. It exists because design-parity work needs a genuine,
unmodified GitLab instance to compare against, and because it is a legitimate way to run GitLab
today while this fork's own package is still new. Running it gets you **stock GitLab, not this
fork**; see the root README for that distinction in full.

```bash
export GITLAB_HOME=/srv/gitlab
export GITLAB_HOSTNAME=gitlab.example.com
docker compose -f deploy/upstream-baseline/docker-compose.yml up -d
```
