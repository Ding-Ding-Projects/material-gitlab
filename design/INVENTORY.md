# Build inventory — GitLab CE/EE → Material Design 3

Status: ☐ planned ◐ in progress ☑ delivered (as interactive front-end prototype, mock data)

## Shell (in every screen)
- ☑ MD3 sidebar (shared Sidebar.dc.html) (Pinned / Code / Plan / Build & Secure / Agent Memory / Manage)
- ☑ Top bar: regex search + advanced builder (shared Regex Builder.dc.html), palette (shared Command Palette.dc.html), theme toggle
- ☑ Light/dark themes (full MD3 token set)

## Wave 1 — Issues & Boards (Issues.dc.html) ☑
- List view: state icons, labels, assignee, filters (Open/Closed/Mine), live count, empty state
- Board view: 4 columns, drag & drop between columns, quick-add per column
- Issue detail drawer: label toggling, assignee picking, close/reopen
- New-issue dialog
- Regex search + builder with snippets and live match preview
- Command palette: pages + actions

## Wave 2 — Merge Requests + Pipelines ☑ (Merge Requests.dc.html, Pipelines.dc.html)
- MR list: status, approvals, pipelines, review states, filters
- MR detail: overview, diff viewer (file tree, inline changes), discussion threads, approve/merge flow
- Pipelines list: status graph, stages, duration; pipeline detail with job DAG, job log, retry/cancel

## Wave 3 — Repository + Settings ☑ (Repository.dc.html, Settings.dc.html)
- Project home: readme, stats, commit history, language bar
- File browser: tree, blob viewer, blame/history tabs, branch switcher
- Settings: general, members, integrations, CI/CD variables, protected branches

## Wave 4 — EE + activity ☑ (Epics.dc.html, Security.dc.html, Todos.dc.html)
- Epics & roadmap: epic tree, timeline/roadmap view
- Security dashboard: vulnerability list, severity chart, triage drawer
- To-Do list + activity feed

## Wave 5 — Agent Memory section ☑ (Agent Memory.dc.html)
- Memory console: instructions inventory, skills catalog, sync status + attestation, history with restore
- Status hub: session cards, inboxes, evidence metadata, live refresh
- Regex builder on every search surface (already the pattern in Wave 1)
- Command palette on every surface (already the pattern in Wave 1)
- Vocabulary JSON upload control (empty states)
- Local file-converter and logo-customization surfaces (settings pages)
- Dim Sum Atlas–style catalog view (optional companion)

## Explicitly out of scope
- Real backend, git operations, CI execution, auth — this is a front-end prototype
