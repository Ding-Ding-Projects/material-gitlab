# syntax=docker/dockerfile:1
# Material GitLab container image.
#
# Derived from omnibus-gitlab docker/Dockerfile at 19.3.0+ce.0 (Apache-2.0, see
# UPSTREAM-NOTICE.md). It installs the Debian package built from THIS fork, so the
# running instance carries the Material work rather than stock upstream GitLab.
#
# Two ways to supply the package:
#   1. Put the .deb under deploy/docker/packages/ before building (no network needed).
#   2. Pass --build-arg DOWNLOAD_URL=<release asset URL of the .deb>.
# The packages directory is bind-mounted during the install step, so a local package never
# becomes an image layer.

ARG BASE_IMAGE=docker.io/ubuntu:24.04
FROM $BASE_IMAGE

ARG BASE_IMAGE
ARG RELEASE_PACKAGE=gitlab-ce
ARG RELEASE_VERSION=local
ARG DOWNLOAD_URL=
ARG TARGETARCH

LABEL org.opencontainers.image.source="https://github.com/Ding-Ding-Projects/material-gitlab" \
      org.opencontainers.image.title="Material GitLab" \
      org.opencontainers.image.description="GitLab CE package built from the Material GitLab fork, in the official Omnibus container layout" \
      org.opencontainers.image.version=$RELEASE_VERSION \
      org.opencontainers.image.base.name=$BASE_IMAGE

SHELL ["/bin/sh", "-c"]

# Default to supporting utf-8
ENV LANG=C.UTF-8

# Explicitly set supported locales
COPY locale.gen /etc/locale.gen

# Install required packages
RUN apt-get update -q \
    && DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
      busybox \
      ca-certificates \
      locales \
      openssh-server \
      tzdata \
      tzdata-legacy \
      wget \
      perl \
      libperl5.38 \
      libatomic1 \
    && locale-gen \
    && cp -a /usr/lib/locale/locale-archive /tmp/locale-archive \
    && DEBIAN_FRONTEND=noninteractive apt-get purge -yq locales \
    && mv /tmp/locale-archive /usr/lib/locale/locale-archive \
    && rm -rf /var/lib/apt/lists/*

# Use BusyBox
ENV EDITOR=/bin/vi
RUN busybox --install \
    && { \
        echo '#!/bin/sh'; \
        echo '/bin/vi "$@"'; \
    } > /usr/local/bin/busybox-editor \
    && chmod +x /usr/local/bin/busybox-editor \
    && update-alternatives --install /usr/bin/editor editor /usr/local/bin/busybox-editor 1

# Remove MOTD
RUN rm -rf /etc/update-motd.d /etc/motd /etc/motd.dynamic
RUN ln -fs /dev/null /run/motd.dynamic

ENV GITLAB_ALLOW_SHA1_RSA=false

# The RELEASE file is generated from build arguments instead of being committed, so one
# recipe serves every package version.
RUN printf 'RELEASE_PACKAGE=%s\nRELEASE_VERSION=%s\nDOWNLOAD_URL_amd64=%s\nDOWNLOAD_URL_arm64=\n' \
      "$RELEASE_PACKAGE" "$RELEASE_VERSION" "$DOWNLOAD_URL" > /RELEASE

# Copy assets
COPY assets/ /assets/
RUN --mount=type=bind,source=packages,target=/tmp/packages \
    chmod -R og-w /assets /RELEASE \
    && /assets/setup

# Allow to access embedded tools
ENV PATH=/opt/gitlab/embedded/bin:/opt/gitlab/bin:/assets:$PATH

# Resolve error: TERM environment variable not set.
ENV TERM=xterm

# Expose web & ssh
EXPOSE 443 80 22

# Define data volumes
VOLUME ["/etc/gitlab", "/var/opt/gitlab", "/var/log/gitlab"]

# Wrapper to handle signal, trigger runit and reconfigure GitLab
CMD ["/assets/init-container"]

HEALTHCHECK --interval=60s --timeout=30s --retries=5 \
CMD /opt/gitlab/bin/gitlab-healthcheck --fail --max-time 10
