# AAMUP OS Architecture

## Principles

1. **Branding is configuration.** Product identity must be replaceable without rewriting business logic.
2. **Modules own their integrations.** GitHub, weather, markets, audio, and future domains should remain independently testable.
3. **The frontend does not own privileged host access.** Native system information will come through narrow Tauri commands.
4. **Events connect subsystems.** Cross-module communication should use typed events rather than implicit imports where practical.
5. **Secrets stay outside source control.** External tokens belong in environment variables or OS credential storage.
6. **Git history documents architecture.** Commits should describe coherent engineering changes, not arbitrary file churn.

## Near-term boundary

The v0.1 frontend is presentation-only. `useDemoTelemetry` exists specifically so interface work can proceed before privileged host telemetry is available. In v0.2, it should be replaced behind the same frontend shape by a native telemetry adapter.

## Future topology

```text
React UI
   │
   ├── module registry
   ├── event client
   └── command client
          │
          ▼
     Tauri IPC boundary
          │
          ▼
       Rust core
   ┌──────┼───────────┐
   │      │           │
telemetry storage   integrations
   │      │           │
   └──── event bus ───┘
```
