---
stage: none
group: unassigned
info: Material GitLab overlay documentation.
title: Destructive super confirmation
---

Material GitLab replaces the "type the name to confirm" step in destructive dialogs with a
super confirmation that never asks you to type anything.

## Behavior

1. The dialog names exactly what is affected (for example the project path).
1. Two key switches must both be turned. Each key states one consequence.
1. Only then does the slide-to-confirm slider unlock. Releasing it before the end springs it
   back to zero. Reaching 100% authorizes the action once.
1. **Emergency exit** (or <kbd>Esc</kbd>) cancels at any point without side effects and resets
   both keys and the slider.

Turning a key off again relocks the slider and resets its progress. When the host dialog has an
extra precondition, such as the permanent deletion checkbox, the slider stays locked and says
why until it is satisfied. A failed request resets the gate so the user starts again from the
first key.

## Where it is used

- `ConfirmDangerModal` (`app/assets/javascripts/vue_shared/components/confirm_danger/`), which
  covers project transfer, visibility reduction, fork removal, group transfer and every other
  caller of the shared danger modal.
- The group and project delete modal (`app/assets/javascripts/groups_projects/components/delete_modal.vue`).

The component lives at `app/assets/javascripts/material_system/components/super_confirmation.vue`
and its styles at `app/assets/stylesheets/md3/components/_super_confirmation.scss`.

## Accessibility

- Keys are real buttons with `role="switch"` and `aria-checked`.
- The slider is a native range input with a label that explains why it is locked, and
  `aria-valuetext` announces progress.
- All motion (key rotation, striped fill, springy corners) is removed under
  `prefers-reduced-motion`.

## Tests

- `spec/frontend/material_system/components/super_confirmation_spec.js`
- `spec/frontend/vue_shared/components/confirm_danger/confirm_danger_modal_spec.js`
- `spec/frontend/groups_projects/components/delete_modal_spec.js`
- Feature specs drive the gate through `SuperConfirmationHelpers#complete_super_confirmation`.

## Known limitations

- Rails-rendered (HAML) danger forms that do not use the Vue modal are not converted yet.
