# GitHub Intelligence

The GitHub module begins with local repository intelligence.

## Current capability

AAMUP OS can inspect the repository it was built from and report:

- current branch
- current HEAD short SHA
- latest commit message
- total commit count
- changed file count
- clean/dirty working-tree state
- configured `origin` remote
- ahead/behind counts when an upstream branch exists

The implementation is intentionally local-first. It does not require a GitHub token and does not send repository data to an external service.

## Planned remote capability

Future milestones can add:

- authenticated GitHub profile
- repository metadata
- pull requests
- issues
- workflow/CI state
- contribution activity
- release state
