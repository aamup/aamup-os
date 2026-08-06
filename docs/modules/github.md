# GitHub Intelligence

GitHub Intelligence combines local Git state with live remote repository data.

## Local intelligence

`github local` reads the repository directly through the native Rust layer:

- branch
- HEAD SHA
- latest commit message
- commit count
- working-tree state
- changed files
- origin
- ahead / behind state

## Remote intelligence

The Rust backend talks directly to the GitHub REST API for `aamup/aamup-os`.

Available commands:

```text
github
github local
github remote
github commits
github issues
github prs
github ci
```

Remote data currently includes repository metadata, recent commits, open issues,
open pull requests, the latest GitHub Actions run, and API rate-limit state.

## Authentication

Because `aamup/aamup-os` is public, remote intelligence works without a token.
For a higher rate limit, AAMUP OS can optionally read `AAMUP_GITHUB_TOKEN` or
`GITHUB_TOKEN`. Tokens remain in the Rust process and are never returned to the
frontend.

## Failure behavior

If GitHub is unavailable, the command reports the remote error and falls back to
local repository state.
