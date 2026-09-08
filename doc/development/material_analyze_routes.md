# Material Analyze project route

Analyze replaces the content of the existing authenticated project value stream page, `projects/cycle_analytics#show`, at `/<namespace>/<project>/-/value_stream_analytics`. The Rails controller and its `authorize_read_cycle_analytics!` boundary remain unchanged. The view emits `#js-material-analyze` with `material_analyze_endpoints`; its page entrypoint calls `mountAnalyze`. The surface declares `data-material-topbar-owner="surface.analyze"` and uses the shared persisted theme preference. It does not mount on global analytics dashboard discovery.

The five tabs follow the project report families represented by `design/Analyze.dc.html` and the actual `lib/sidebars/projects/menus/analytics_menu.rb` plus its EE extension. The current project name, full path, selected/default ref, permitted report links and initial dates come from Rails. No sample identity or project metadata is generated.

## Sources and measurement boundaries

| Tab | Live source | Measurement and time basis |
| --- | --- | --- |
| Value stream | Existing project cycle analytics JSON `{summary, stats, permissions}` | Native summaries and permitted stage medians; duration values are seconds. `cycle_analytics[created_after]` and `[created_before]` define inclusive UTC calendar days. No overall lead/cycle time is inferred by adding stage medians. |
| CI/CD | Native `project.pipelineAnalytics` aggregate and daily series | Explicit `fromTime` and `toTime`. Median duration is the native `Duration` scalar, in seconds. Success percentage divides successful by successful plus failed, excluding canceled/skipped pipelines. |
| Repository | Field-selected GraphQL repository/statistics metadata and the paginated repository commit connection | Commits on the selected ref inside explicit committed-after/before timestamps, including merges. Weekly labels are UTC Mondays; edge weeks may be partial. Repository size and branch count are clearly labelled current snapshots. |
| Contributors | The same complete, time-filtered commit connection | Groups by normalized author email, matching native contributor grouping; names are displayed and addresses are not. This counts commit author identities, not GitLab accounts. Unattributed commits are reported separately. |
| Insights | Native filtered saved configuration and selected chart query endpoint | Uses the actual chart definition, title, labels and series. A configured `group_by` uses its declared/default server-relative period; a query without `group_by` has no date constraint. The common date controls do not apply to Insights. |

The VSA and common date controls support 1 to 180 inclusive days, matching the native value-stream maximum. Invalid calendar dates, reversed ranges and oversized ranges are rejected before a request. The displayed observation caption is bound to the range actually sent, even if the inputs change while its request is running.

Repository metadata selects only `repository { empty rootRef branchCount }` and `statistics { repositorySize }`. No broad REST Project entity is requested. Commit requests select only SHA, observation date and author identity fields. Connections follow every cursor up to the shared bounded pagination limit; repeated, missing or excessive cursors fail rather than turning a first page into a total. Duplicate and out-of-range observations are rejected.

## Availability and retained reports

Every tab respects its native project abilities and feature availability. CI/CD requires readable builds, `read_ci_cd_analytics`, and a nonempty repository. Repository/Contributors require `read_repository_graphs` and a nonempty repository. Insights requires its project feature plus `read_insights`. Unsupported reports show an explicit unavailable state without issuing a substitute data request.

Date-bounded pipeline aggregates are requested only when the host reports ClickHouse analytics support. An instance with only legacy fixed-period analytics keeps its native CI/CD report link; its all-time counts are not mixed into a custom-date report. Native repository coverage, advanced contributor charts, configured Insights, and permitted value-stream editing/creation remain linked through their existing Rails routes. This surface does not add a duplicate stock content panel.

The design's flaky-test, test-coverage, review-duration, active-branch, bug and security-finding examples are not universal analytics fields. Unavailable metrics are labelled unavailable; current branch count is named accurately. Insights displays configured measurements rather than inventing those fixed cards. Specialized Insights sources such as DORA retain the full-report link and an explicit compact-view limitation instead of applying count units to duration or percentage data.

Bar widths are derived from observed nonnegative numeric values relative to the largest observation in the report. Missing values have no bar and show `Unavailable`; a real zero remains zero. Values are rendered outside the fill so zero or narrow bars do not hide their labels. Series/categories from Insights are never summed into a unique issue total because configured labels can overlap. No trend percentage is shown without a measured comparison period.

## Verification

Run `node --test spec/frontend/material_system/analyze_project_adapter.test.cjs`. The 14 focused checks cover range validation, null-versus-zero behavior, native duration units, VSA stage authorization, pipeline rate semantics and request bounds, unavailable-report request suppression, complete commit pagination, privacy-limited metadata selection, invalid observation rejection, configured Insights request/response semantics, stale-request labeling, and the exact project host/topbar boundary. The suite parses all GraphQL documents and compiles the Analyze Vue template and script. `ruby -c app/helpers/material_analyze_helper.rb` checks helper syntax.

These are source and adapter checks. They do not claim that Rails requests executed against a built instance, that browser interactions succeeded, or that design parity was measured. Runtime verification remains tied to the integrated built candidate. No demo screenshots were generated.
