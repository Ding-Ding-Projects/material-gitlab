# Material GitLab Deployer

This package is a small Electron renderer skeleton for selecting a deployment target and reviewing a bounded command plan. It supports WSL2, local Docker, and SSH Docker targets.

The current shell is preview-only: it does not execute commands. `src/shared/model.ts` defines the typed configuration and redacted representation; `src/shared/plan.ts` validates inputs and builds an allowlisted plan without embedding secret values.

Build with `npm run build` from this directory and launch the resulting Electron shell with `npm start`.
