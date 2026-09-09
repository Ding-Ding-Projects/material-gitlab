# Design parity fixture

`scripts/design-parity/seed.rb` creates the isolated product data used for real
design-parity verification, through the product's own models and services, with fixed
timestamps so repeated captures compare like for like. It refuses to run anywhere it was
not explicitly pointed at, and it never creates users, modifies instance settings, reads or
prints credentials, or deletes data. Output contains only fixture identifiers and relative
product URLs.

## Target instance kinds

| `DESIGN_PARITY_FIXTURE_INSTANCE` | Accepted when | Typical invocation |
| --- | --- | --- |
| `gdk` | `Rails.env` is `development` or `test` | `bundle exec rails runner scripts/design-parity/seed.rb` inside the GDK session |
| `lan-omnibus` | `DESIGN_PARITY_FIXTURE_HOST` equals the configured GitLab host, and the instance either holds no projects or already carries the fixture marker | `docker exec -e DESIGN_PARITY_FIXTURE_INSTANCE=lan-omnibus -e DESIGN_PARITY_FIXTURE_HOST=<host> material-gitlab gitlab-rails runner /path/to/seed.rb` |

The second kind exists for a dedicated verification instance of the packaged fork running on
a private network. Both checks are deliberate: the host comparison stops the script running
against an instance it was not aimed at, and the emptiness or marker check stops it seeding a
shared instance that happens to be reachable. Any other value, or a missing value, aborts.

## What it provisions

Inside the marked group `design-parity-fixture` and project `product-verification`, all
idempotent and all marked `[design-parity-fixture]` where the record carries a description:

- a source branch `fixture/design-parity` with a real commit;
- a `.gitlab-ci.yml` on the default branch with build, test and deploy stages;
- a label, a milestone, an issue and a merge request;
- a pipeline for the default branch created through the pipeline service (its jobs stay
  pending on an instance without runners, which is the honest state and is captured as such);
- a release `v1.0.0-parity` and an environment `production`;
- a to-do for the admin user on the fixture issue;
- an epic, only when the instance's licence makes epics available; otherwise the output
  records that no epic was created.

Model timestamps and visible fixture text are fixed for deterministic captures. Repository
commits go through the native repository service and keep its normal commit timestamp.

The script requires an existing admin account for normal sign-in. It neither reads nor emits
credentials, and it is not an authentication bypass. Service return shapes differ across
GitLab versions; the script accepts either a record or a service response and aborts with the
service's own message when neither yields a persisted record.
