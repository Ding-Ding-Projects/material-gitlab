# Design interaction repairs

The material surfaces keep interaction state honest when a production integration is unavailable or invalid.

- The Login surface requires its host to supply `authenticate`. Its default rejects sign-in after local required-field validation, so entering nonempty credentials never creates a local authenticated state.
- Pipeline job selection uses a stage-qualified key (`<stage>:<job key>`). Trace updates therefore affect the selected job even when more than one stage has the same job key. The pipeline list shows a loading state, an error alert, and a retry action while its initial request is unresolved or fails.
- Monitor and Operate share `LiveCollectionSurface`. Invalid regular expressions produce an accessible validation message and no matches, rather than treating every row as a match.
- The shared command palette uses a combobox with an active descendant that points to its current option. Its Tab handling loops focus through the palette controls until the palette closes.

Focused coverage is in `spec/frontend/material_system/design_interaction_repairs_spec.js`.
