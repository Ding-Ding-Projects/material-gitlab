# Material Code and Repository production routes

## Code

Code replaces the collection content on the existing branches index, commits show and tags index routes. Each host supplies the project URL, full path, initial tab, resolved ref/path, permissions and actual authoring links through `material_code_data`. The routes render the design surface once, with the existing enclosing project layout.

Branch, commit, tag and snippet lists traverse the native API page headers rather than silently stopping at one page. Unknown commit pipeline status remains unknown; it is never shown as success. Comparison describes the API result without inventing branch ancestry.

Branch and tag deletion re-read the exact resource, reject protected/default branches and protected tags, and await native DELETE responses. Snippet deletion uses its native project snippet endpoint. The existing Axios client supplies session credentials, CSRF and XHR headers. Per-project abilities control visibility and the server enforces current per-resource authorization.

Confirmed bulk deletion processes each selected resource independently. Only an actual successful HTTP response removes that row and its selection. Failed or skipped rows remain selected with their error messages, and an incomplete batch never receives an all-success message. Destructive controls remain inactive while a batch runs. The confirmation dialog keeps keyboard focus and restores the invoking control.

Branch, tag and snippet creation, branch rules, commit details, branch files, tags and snippet details remain accessible through real routes. Commits hosts retain the resolved ref and nested path for their API query.

## Repository

Tree and blob views supply explicit `entry_type`, resolved `ref`, `ref_type`, canonical `path`, and the current reader's actual star preference. Their page entrypoints mount the Material Repository once. A blob starts with its parent tree and then loads the exact file; a tree starts with that directory. Root navigation is an explicit empty path, not a fallback to the original directory. Blob caches use full paths, and late responses from another directory/ref are ignored.

The production adapter uses same-origin REST collections and field-selected GraphQL project metadata, respecting relative-URL-root installations. It never requests the broad REST Project entity. The metadata query selects only project identity/name/visibility, star/fork counts, clone URLs, repository empty/root-ref state, and authorized commit-count/repository-size statistics. All GraphQL fields were checked against the native Project, Repository and ProjectStatistics types. Branch choosers, trees and tags traverse page headers up to a bounded 100-page limit. A repeated/oversized pagination chain fails explicitly instead of presenting a partial collection as complete. Recent commits remain a 20-row recent list. Commit totals and repository size appear only when the authorized project statistics response provides them. The storage shard name is never labelled as byte size. Language percentages come from the project languages API.

An explicitly empty project response produces an empty state and skips tree queries. An arbitrary 404 remains a failure. Existing tree/blob Rails controllers require a nonempty project, so this adapter capability does not claim to replace the separate empty-project entry page.

Repository Files responses are decoded only as declared base64. Strict UTF-8 validation preserves real text, including an empty file; binary or unsupported-encoding content has an explicit state and a raw download link. Submodule entries retain their type and pinned commit and are not sent to the file-content API.

Selected downloads support exactly one item at a time. A selected file uses its exact raw-file API route; a selected directory uses the native archive endpoint with that one path. Zero or multiple selections never fall back to the whole repository. The interface disables ambiguous multi-selection downloads and states the limitation. A native whole-source download can be added as a separately labelled operation, not disguised as selected download.

The production adapter declares file deletion unsupported, so its bulk Delete control is hidden. File edits/deletions are performed through the actual editor workflow, which creates a commit and applies branch protection. Existing file history, blame, editing and Web IDE routes remain linked without rendering duplicate native content panels.

Star toggling starts from the authenticated server-provided preference and uses native `starProject`, selecting only its count and errors. It never consumes the broad REST star/unstar response. Forking opens the permission-authorized Rails creation form so the user can choose a destination; it does not call the broad REST fork-creation endpoint or claim that a fork was created.

## Verification

Run `node --test spec/frontend/material_system/code_repository_actions.test.cjs` for focused behavioral coverage. The 15-test suite checks exact outgoing metadata field selection, refusal of broad REST project reads, bounded star responses, authorized fork-form navigation, protection revalidation, actual HTTP acceptance, deferred and partially rejected deletion, selection retention, pagination, unknown pipeline states, initial blob state, explicit root navigation, authoritative statistics, empty versus failed reads, UTF-8/binary handling, exact selected downloads and star transitions. It also compiles every Vue script and template under Code and Repository. The helper is covered by a Ruby syntax check.

The existing Jest route and adapter specs are updated to the production host metadata and exact selection contract. Full-project Jest and built Rails/browser verification belong to the integrated candidate. These focused checks do not claim runtime route execution, complete design parity or visual evidence. No demo screenshots were produced.
