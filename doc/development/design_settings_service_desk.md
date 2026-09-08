---
stage: none
group: unassigned
title: Service Desk settings design adapter
---

The Service Desk settings design adapter replaces the legacy mounted controls with `ServiceDeskSettings.vue`. The host renders `material_settings_service_desk_data(project)` as inert JSON and supplies it to the component. The design surface owns all interactive controls and does not mount the legacy partial inside its chrome.

The helper emits only route, capability, and non-secret setting state. It retains the original `ServiceDesk.supported?` availability boundary and includes the selected template key plus its source project identifier. It never emits SMTP passwords, authentication credentials, or credential-derived secret values. Custom email status can disclose the configured address, enabled flag, verification state and error, and SMTP host, matching the existing controller response. Credentials remain write-only.

`service_desk_adapter.js` uses only local paths, same-origin credentials, the current CSRF value, and `redirect: 'error'`. Each operation requires exact server-provided permission metadata before transport. The Service Desk update route persists enablement, template selection, sender name, key suffix, confidentiality, Cc participants, and reopen-on-external-comment settings. The custom email route provides load, create and verification, enablement, and removal. Custom-email responses are allowlisted to safe state fields. Failures use a generic message rather than reflecting a server response that could include submitted credentials. Typed custom-email credentials are cleared after submission or user cancellation.

The host must provide exact server permission metadata and must render this component in the additional Advanced section. It must not initialize the legacy Service Desk JavaScript root alongside this component, because that would render duplicate live controls.
