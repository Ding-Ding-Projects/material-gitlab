# Upstream notice

The files in this directory were copied from omnibus-gitlab at tag `19.3.0+ce.0`
(https://gitlab.com/gitlab-org/omnibus-gitlab), which is licensed under Apache-2.0. The
full licence text is in `UPSTREAM-LICENSE-Apache-2.0.txt`. The SHA-256 values below are of
the upstream originals at that tag, so anyone can confirm which files are unchanged and diff
the two that are not.

| File | Upstream SHA-256 at `19.3.0+ce.0` | Local change |
| --- | --- | --- |
| `docker/Dockerfile` | `e0d10ef8c5209e930fe462c5c4ba399d09e50d19c8cf6920d34c16a105b8287b` | `RELEASE` is generated from build arguments; the `packages/` directory is bind-mounted during install so a local package never becomes a layer; OCI labels name this fork |
| `docker/assets/setup` | `55f53c92c46720cbe7757a98e9420ac10c4077c78a8a5511833c70be1ff0b597` | installs a local package from `/tmp/packages` when one is present, otherwise downloads `DOWNLOAD_URL`; fails plainly when neither exists |
| `docker/assets/download-package` | `25f87078e16873ea7edd673b95747f2be56317ed627d2e33fb5908969898fbde` | unchanged |
| `docker/assets/gitlab.rb` | `dc30cee590059d90d047732da5f21264a2532f91519d863bc2d49be823cd67ee` | unchanged |
| `docker/assets/init-container` | `eb4da579b3647c37e54ec9dcbd7e6340695e58a2f42cd67ef7ef511279c21d95` | unchanged |
| `docker/assets/sshd_config` | `a18f130388a04295331aa387e08ec8c3ca0a9045e4eb84ffd04f307f252a769e` | unchanged |
| `docker/assets/update-permissions` | `7e77d3154e3e7680970c09869c15f318f39cd729aae63ce85e402754e2dfbc5a` | unchanged |
| `docker/locale.gen` | `a1bc8f286e3c24cf2de0eb207b65b05e8af1e6a8a536fb1b64c6d37cab49728b` | unchanged |

`packages/` is a build input directory: drop the release `.deb` there for a local build. The
`.gitignore` inside it keeps packages out of version control.
