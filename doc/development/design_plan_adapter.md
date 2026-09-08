# Plan REST adapter

The Material Plan design surface has no production fixtures. Its project-scoped
adapter is created with `createProjectPlanProps({ projectId, root })` and passed
to `mountPlan` as normal component props. A host can also add `data-project-id`
to the Plan mount element and let `mountPlan` create the same props seam.

The adapter uses existing GitLab REST v4 resources:

* milestones: `GET /api/v4/projects/:id/milestones?state=all` and `PUT`
  updates with `state_event: close` or `state_event: activate`;
* iterations: `GET /api/v4/projects/:id/iterations?state=all`, when the
  installed GitLab edition exposes it;
* wiki: `GET /api/v4/projects/:id/wikis?with_content=1` and a slug-encoded
  `PUT /wikis/:slug` that preserves the format fetched with the page.

Mutating REST requests use the page's CSRF token and same-origin credentials.
`204 No Content` is accepted as a successful delete response.

Requirements have no project REST v4 resource in this adapter. They report an
explicit per-tab unavailable state rather than a locally invented collection.
Likewise, an unavailable iterations endpoint stays confined to the Iterations
tab. One CE-only resource does not prevent milestones or wiki documents from
loading and operating.

The production mount replaces the project milestones index. The page supplies
the project ID and current user's milestone/wiki mutation abilities. Milestone
titles link to their existing detail pages for editing and lifecycle operations,
and the authorized New milestone action retains the existing creation form. Wiki
editing links to the existing wiki route for creation, history, and rendered
document tools. This surface displays wiki source text and preserves its format
on save; it does not claim to render markup. Iterations support reading/export
only, with an explicit message directing scheduling to the parent group.

REST collections follow 100-record pages, capped at 100 pages. Invalid list
responses, pagination overflow, authorization denial, and unavailable edition
features are errors, never empty success. Numeric iteration states are mapped to
upcoming/active/closed. Wiki saving keeps the edit buffer after rejection and uses
the returned server page after success rather than inventing an edit timestamp.
The frontend props and transport specifications are local verification, not built
route or visual parity evidence.
