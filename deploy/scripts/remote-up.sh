#!/usr/bin/env bash
# Bring the Material GitLab container up on a remote Docker host over SSH.
#
# Usage:
#   deploy/scripts/remote-up.sh <ssh-target> <remote-dir> [deb-url] [version-tag]
#
#   ssh-target   for example deploy@docker.example.internal
#   remote-dir   directory on the host that holds (or will hold) the Compose file, the
#                image recipe, and a .env you wrote there by hand; see README.md
#   deb-url      optional release asset URL of the .deb; when given, the image is built on
#                the host from that package instead of pulled from the registry
#   version-tag  optional tag recorded in the image, for example 19.3.0-pre-<sha12>
#
# What it does, in order: copies docker-compose.yml and deploy/docker/ to the host, refuses
# to continue without a .env there, builds or pulls the image, starts the container, waits
# for the health check, and prints the sign-in URL. It never prints the .env, never creates
# a password, and never touches other containers on the host.

set -euo pipefail

target="${1:?usage: remote-up.sh <ssh-target> <remote-dir> [deb-url] [version-tag]}"
remote_dir="${2:?usage: remote-up.sh <ssh-target> <remote-dir> [deb-url] [version-tag]}"
deb_url="${3:-}"
version_tag="${4:-local}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ssh_opts=(-o StrictHostKeyChecking=accept-new -o UpdateHostKeys=no -o ConnectTimeout=15)

log() { printf '%s\n' "$*"; }

log "Copying the Compose file and image recipe to $target:$remote_dir"
ssh "${ssh_opts[@]}" "$target" "mkdir -p '$remote_dir/deploy/docker/packages'"
scp "${ssh_opts[@]}" -q "$repo_root/docker-compose.yml" "$target:$remote_dir/docker-compose.yml"
scp "${ssh_opts[@]}" -q -r "$repo_root/deploy/docker/Dockerfile" "$repo_root/deploy/docker/.dockerignore" \
  "$repo_root/deploy/docker/locale.gen" "$repo_root/deploy/docker/assets" "$target:$remote_dir/deploy/docker/"

log "Checking the host configuration"
ssh "${ssh_opts[@]}" "$target" "test -s '$remote_dir/.env'" || {
  log "No .env at $remote_dir on $target. Write one there first (GITLAB_HOSTNAME, GITLAB_HTTP_PORT, GITLAB_SSH_PORT, GITLAB_HOME, optional GITLAB_ROOT_PASSWORD) with mode 600, then rerun."
  exit 1
}
ssh "${ssh_opts[@]}" "$target" "cd '$remote_dir' && docker compose config --quiet"

if [ -n "$deb_url" ]; then
  log "Building the image on the host from the release package"
  ssh "${ssh_opts[@]}" "$target" "cd '$remote_dir' && MATERIAL_GITLAB_DEB_URL='$deb_url' MATERIAL_GITLAB_VERSION='$version_tag' docker compose build --pull"
else
  log "Pulling the published image named in .env (MATERIAL_GITLAB_IMAGE)"
  ssh "${ssh_opts[@]}" "$target" "cd '$remote_dir' && docker compose pull"
fi

log "Starting the container"
ssh "${ssh_opts[@]}" "$target" "cd '$remote_dir' && docker compose up -d"

log "Waiting for the health check (up to 20 minutes on first boot)"
healthy=0
for _ in $(seq 1 120); do
  state="$(ssh "${ssh_opts[@]}" "$target" "docker inspect --format '{{.State.Health.Status}}' material-gitlab 2>/dev/null || echo missing")"
  case "$state" in
    healthy) healthy=1; break ;;
    missing) log "The container is not running."; ssh "${ssh_opts[@]}" "$target" "cd '$remote_dir' && docker compose logs --tail 40 gitlab" || true; exit 1 ;;
  esac
  sleep 10
done
if [ "$healthy" != "1" ]; then
  log "Not healthy after 20 minutes. Last log lines:"
  ssh "${ssh_opts[@]}" "$target" "cd '$remote_dir' && docker compose logs --tail 60 gitlab" || true
  exit 1
fi

url="$(ssh "${ssh_opts[@]}" "$target" "cd '$remote_dir' && docker compose exec -T gitlab sh -c 'grep -m1 external_url /etc/gitlab/gitlab.rb 2>/dev/null || true'" | sed -E "s/.*external_url '([^']+)'.*/\1/")"
image="$(ssh "${ssh_opts[@]}" "$target" "docker inspect --format '{{.Config.Image}} {{index .RepoDigests 0}}' material-gitlab 2>/dev/null || docker inspect --format '{{.Config.Image}}' material-gitlab")"
version="$(ssh "${ssh_opts[@]}" "$target" "docker exec material-gitlab cat /opt/gitlab/embedded/service/gitlab-rails/VERSION")"
log "healthy"
log "image:   $image"
log "version: $version"
log "sign in: ${url:-see GITLAB_HOSTNAME and GITLAB_HTTP_PORT in .env} as root"
log "If GITLAB_ROOT_PASSWORD was not set, read the generated one within 24 hours:"
log "  ssh $target docker exec material-gitlab grep Password: /etc/gitlab/initial_root_password"
