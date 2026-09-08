# Disposable WSL rendering studio

This is a graphics-production tool, not another supported product platform. It creates
original conceptual illustrations, not screenshots or evidence of deployed GitLab features.
The website layout is unchanged. `site/assets/3d/` contains the delivered artwork and its
hash manifest; this folder contains the scene generator, exporter and verification script.

## Environment and import

`environment.json` pins the downloads, checksums and renderer used for the delivered set.
Download the root filesystem and Blender only from the recorded official URLs. Verify both
against the pinned SHA-256 values. The Ubuntu `current` URL is mutable: a mismatch means
stop and review a newer image, never silently accept different bytes.

Choose a fresh distribution name and a fresh directory outside the repository. Keep a
receipt of that exact name and directory. Do not use an existing distribution or change
global WSL settings, host drivers or the default distribution.

On the observed WSL 2.7.11 installation, use an uncompressed tar, an explicitly created
destination directory and native absolute Windows paths. The compressed-path attempt
crashed the WSL service twice. Changing these three inputs together succeeded; no isolated
cause was established. There is no reason to repeat the crashing variant.

```powershell
# Set these to new, task-owned paths. Never reuse an existing distribution name.
$studioName = 'material-gitlab-blender-UNIQUE'
$studioPath = Join-Path $env:LOCALAPPDATA 'BlenderStudios\UNIQUE\distro'
$rootfsTar = Join-Path $env:LOCALAPPDATA 'BlenderStudios\UNIQUE\ubuntu.rootfs.tar'
New-Item -ItemType Directory -Path $studioPath -ErrorAction Stop
wsl --import $studioName $studioPath $rootfsTar --version 2
if ($LASTEXITCODE -ne 0) { throw 'WSL import did not finish' }
```

Install the packages listed in `environment.json` using Ubuntu's package manager. Extract
the verified Blender tarball into `/opt/blender`. Run `/opt/blender/blender --version` and
`/usr/lib/wsl/lib/nvidia-smi`; the latter only reports availability, so a real small CUDA
render must still succeed. Use `--device CPU` when CUDA is unavailable. No display is needed.
On this host, files written by the command environment under LocalAppData were not all
visible through `/mnt/c` in WSL. Fetching and verifying Blender inside the disposable
distribution worked. Copying source from the repository and output to Documents worked.

## Render, reopen and export

Copy the three Python scripts to `/studio`. Use a new output directory for each render.
These commands execute inside the disposable distribution:

```sh
/opt/blender/blender -b -t 6 --python-exit-code 1 --python /studio/generate.py -- \
  --output /studio/release --device CUDA --samples 96 --scale 100
/opt/blender/blender -b -t 6 --python-exit-code 1 --python /studio/verify-blends.py -- \
  /studio/release /studio/verification
```

The second command reopens all eight saved scenes with automatic scripts disabled,
checks the camera, full dimensions, relative output path, transparency and lack of
external linked resources, and makes eight small CPU verification renders. It does not
modify the saved files. CUDA was used for the full set; CPU verifies portability.

Copy the release folder and verification results to a durable location outside WSL.
Install Pillow in an isolated Python environment if it is missing. Then use PowerShell:

```powershell
python design/3d/export.py --input 'C:\absolute\preserved-masters' --output site/assets/3d
python design/3d/export.py --input 'C:\absolute\preserved-masters' --output site/assets/3d --verify-only
```

The export includes eight PNG masters, eight compressed editable `.blend` sources,
eight full-resolution lossless WebPs, eight responsive WebPs and one contact sheet.
Hero responsive images are 1200 × 800; feature responsive images are 600 × 600.
Use WebP in the page, select the matching light/dark treatment, keep the aspect ratio,
and provide an empty alternative text when the image only decorates adjacent explanatory
copy. Do not bake translated text into the artwork. The render background is transparent;
the contact sheet alone composites explicit background colours for inspection.

## Preserve before retirement

Verify every exported hash and reopen every preserved `.blend` before retirement.
Keep the source scripts, download provenance, PNG masters, WebPs, manifest and verification
receipt outside the distribution. Commit only the intended small source and image files.
Large files require the repository's approved large-file transfer route; the exporter
refuses `.blend` sources at or above 10 MiB. The delivered compressed scenes are much smaller.

Match the recorded task-owned distribution name and its registered BasePath before
retirement. Then terminate and unregister that exact name, never a wildcard, the default
distribution or an existing shared distribution. `wsl --unregister` deletes its virtual disk.
Read `wsl --list --verbose` afterward and verify only that name disappeared. If preservation
or ownership cannot be verified, retain the distribution and report the remaining work.

Source construction is deterministic for the fixed script, cameras, materials and seeds.
Pixel-identical output across different GPU drivers, devices or Blender builds is not promised.
