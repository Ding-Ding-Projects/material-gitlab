# Design parity fixture

`scripts/design-parity/seed.rb` creates the isolated product data used for real
design-parity verification. Run it only through the normal authenticated GDK session:

```powershell
$env:DESIGN_PARITY_FIXTURE_INSTANCE = 'gdk'
bundle exec rails runner scripts/design-parity/seed.rb
```

The script refuses every environment other than `development` or `test` and refuses
to run unless the explicit GDK marker is set. It does not create users, modify instance
settings, inspect credentials, or delete data.

The designated group and project carry a fixture marker. If their fixed paths already
exist without that marker, the script stops rather than adopting or changing existing
data. Within its marked project it idempotently provisions a real repository commit,
label, milestone, issue, and merge request through the product's native models and
services. Its model timestamps and visible fixture text are fixed for deterministic
captures. Output contains only fixture IDs and relative product URLs.

The script requires an existing GDK admin account for normal sign-in. It neither reads
nor emits credentials, and it is not an authentication bypass.
