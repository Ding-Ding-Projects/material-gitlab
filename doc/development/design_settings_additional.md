---
stage: none
group: unassigned
info: For assistance with this topic, see <https://handbook.gitlab.com/handbook/product/ux/technical-writing/#assignments-to-other-projects-and-subjects>.
title: Additional project settings design adapter
---

`AdditionalProjectSettings.vue` renders design-owned forms for project Duo settings, the default work item description, an external authorization classification label, and a repository size limit.

## Host contract

The authenticated project settings host passes `material_settings_additional_data(@project)` to the component as its `metadata` prop. Each available section posts to the Rails-generated project action with the standard `PATCH` method override and `authenticity_token` field. The component rejects unavailable or non-local actions before rendering a form.

## Capability boundaries

- Duo appears only when AI features are licensed and the user can update Duo settings or update an approved secondary security workflow. The approved secondary path renders only SAST vulnerability resolution, SAST false-positive detection, and Secret Detection false-positive detection when their existing feature flags expose them. The full Duo path renders the original available Duo, Amazon Q Auto Review, flow, foundational flow, tool approval, session tracking, and AI audit event toggles with their existing nested or root project parameter names. A setting locked by an ancestor or instance remains visibly locked and has no hidden false-value input. Dependent settings remain disabled until their original prerequisite setting is enabled.

Dependency-bump resolution uses a design-owned dialog and the existing remediation-profile GraphQL contract. The adapter reads the current project's scan profiles, attaches the required dependency-scanning post-processing profile only when absent, propagates returned mutation errors, and sets the native nested project setting only after the attachment succeeds. Cancellation and a failed attachment leave the setting unchanged.
- The default work item description appears only when the project supports issuable default templates, issues are enabled, and the user can administer the project.
- The external authorization classification label appears only when external authorization is enabled and the user can administer the project. A blank value uses the server-provided instance default label.
- The repository size limit appears only when the license provides the setting and the current user has instance-wide administration access. Its value is expressed in MiB.

The Rails controller remains responsible for authorization, licensing, inheritance, validation, and step-up authentication on every submission.
