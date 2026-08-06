# Gource Strategy

The visualization should reflect real project evolution. Do not create empty files or junk commits to make the graph larger.

## Repository-growth sequence

1. Application shell
2. Design system
3. Core configuration
4. Native backend
5. Telemetry
6. Event bus
7. Module SDK
8. GitHub module
9. Weather module
10. News module
11. Markets module
12. Audio engine
13. Visualization engine
14. Assistant
15. Test infrastructure
16. Packaging and release automation

As these areas gain real source files and commits, Gource will naturally develop recognizable clusters.

## Good commits

- `feat(shell): establish AAMUP OS command center`
- `feat(telemetry): add native CPU and memory sampler`
- `feat(github): add repository activity provider`
- `feat(visualization): introduce particle renderer`
- `refactor(core): route module updates through typed event bus`

## Avoid

- `update stuff`
- 30 commits that each change one line for no engineering reason
- generated vendor directories
- committing build artifacts just to add files
