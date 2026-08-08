# AAMUP OS v1.0 Release Acceptance

Release: `1.0.0`

## Automated release gates

- [ ] `./aamup doctor`
- [ ] `./aamup test`
- [ ] `./aamup verify`
- [ ] version consistency
- [ ] AppImage build
- [ ] DEB build
- [ ] CI green on release-candidate branch

## Functional smoke tests

### Core
- [ ] application launches
- [ ] command bar accepts input
- [ ] module navigation works
- [ ] system telemetry refreshes

### Live intelligence
- [ ] weather current data
- [ ] tomorrow weather follow-up
- [ ] markets watchlist
- [ ] news headlines
- [ ] GitHub local status
- [ ] GitHub remote status
- [ ] media degrades safely with no player

### Assistant routing
- [ ] `hi` is a greeting
- [ ] `hi, what is the weather?` routes to Weather
- [ ] `show memory usage` routes to System
- [ ] `why is there no relevant memory?` routes to model

### Memory
- [ ] explicit `remember` persists
- [ ] semantic/lexical recall works
- [ ] conversation persists after restart
- [ ] summary creation works
- [ ] `memory scan` rescans latest summary
- [ ] transient lookups are filtered
- [ ] durable preference/decision is queued
- [ ] approve promotes permanently
- [ ] reject remains auditable
- [ ] duplicate is suppressed

### Failure behavior
- [ ] Ollama offline leaves native modules usable
- [ ] embedding failure falls back to lexical recall
- [ ] live API failure degrades safely
- [ ] dirty working tree blocks unsafe release
- [ ] secret guard blocks credential files

## Packaging
- [ ] AppImage launches
- [ ] DEB installs and launches
- [ ] packaged app persists local data across restart

Promote to `1.0.0` only when all required checks are green and there are no open Severity 1 or Severity 2 defects.
