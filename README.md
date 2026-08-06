# AAMUP // OS

[![CI](https://github.com/aamup/aamup-os/actions/workflows/ci.yml/badge.svg)](https://github.com/aamup/aamup-os/actions/workflows/ci.yml)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-native-000000?logo=rust&logoColor=white)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react&logoColor=000000)
![License](https://img.shields.io/badge/license-TBD-555555)

**AAMUP OS** is a modular native personal-intelligence and system-command platform built with **Tauri, Rust, React, and TypeScript**.

The project started as a command-center shell and is evolving into a desktop operating surface for system telemetry, repository intelligence, external data modules, visualizations, automation, and assistant-driven workflows.

> Current stage: native desktop runtime, live system telemetry, typed event bus, command engine, and local Git repository intelligence.

---

## Current capabilities

### Native desktop runtime

AAMUP OS runs as a Tauri desktop application rather than a browser-only dashboard.

### Live system telemetry

The Rust backend exposes native host telemetry to the React interface through Tauri IPC.

Current metrics include:

- CPU usage
- memory utilization
- disk utilization
- process count
- host name
- operating system
- uptime

### Command engine

The bottom command interface is functional and supports typed commands, aliases, history navigation, and event-driven responses.

Current commands include:

```text
help
system
status
modules
github
git
repo
version
clear
```

### Local Git intelligence

AAMUP OS can inspect the repository it was built from and report:

- current branch
- HEAD commit
- latest commit message
- total commit count
- clean / dirty working-tree state
- changed-file count
- origin remote
- ahead / behind state

### Typed event bus

System and command activity flows through a typed internal event layer and appears in the live Activity panel.

---

## Architecture

```text
AAMUP // OS
│
├── React / TypeScript UI
│   ├── command center
│   ├── system panel
│   ├── activity stream
│   └── module registry
│
├── Core
│   ├── typed event bus
│   ├── command engine
│   ├── module registry
│   └── runtime configuration
│
├── Modules
│   └── GitHub intelligence
│       └── local repository state
│
└── Tauri / Rust
    ├── native application runtime
    ├── host telemetry
    ├── Git process integration
    └── IPC commands
```

Repository layout:

```text
src/
├── app/
├── components/
├── core/
│   ├── commands/
│   ├── config/
│   ├── events/
│   ├── modules/
│   └── types/
├── hooks/
├── modules/
│   └── github/
└── styles/

src-tauri/
├── src/
│   ├── lib.rs
│   └── main.rs
├── Cargo.toml
└── tauri.conf.json

docs/
├── architecture.md
├── gource-strategy.md
└── modules/
    └── github.md
```

---

## Data flow

Native system telemetry:

```text
Linux
  ↓
sysinfo
  ↓
Rust
  ↓
Tauri command
  ↓
IPC
  ↓
TypeScript hook
  ↓
React interface
```

Repository intelligence:

```text
AAMUP command
  ↓
TypeScript command engine
  ↓
Tauri IPC
  ↓
Rust
  ↓
git
  ↓
aamup-os repository
```

---

## Run locally

Requirements:

- Node.js
- npm
- Rust
- Cargo
- Tauri Linux dependencies

Install frontend dependencies:

```bash
npm install
```

Run the browser frontend:

```bash
npm run dev
```

Run the native desktop application:

```bash
npm run tauri dev
```

---

## Validation

Frontend:

```bash
npm run typecheck
npm run build
```

Rust:

```bash
cd src-tauri
cargo fmt -- --check
cargo check
cargo clippy --all-targets --all-features -- -D warnings
```

GitHub Actions runs the same validation on pushes and pull requests to `main`.

---

## Roadmap

- [x] Command-center shell
- [x] Tauri desktop runtime
- [x] Native Rust system telemetry
- [x] Typed event bus
- [x] Command engine
- [x] Local Git repository intelligence
- [ ] Remote GitHub repository metadata
- [ ] Pull request and issue intelligence
- [ ] GitHub Actions / CI intelligence inside AAMUP OS
- [ ] Weather module
- [ ] News module
- [ ] Market module
- [ ] Audio visualization engine
- [ ] Assistant interface
- [ ] Plugin SDK
- [ ] Theme system
- [ ] Desktop release pipeline
- [ ] v1.0

---

## Gource strategy

AAMUP OS is deliberately developed through coherent feature-level commits.

The goal is not artificial commit volume. The repository is structured so major subsystems grow independently over time:

```text
core
├── events
├── commands
└── modules

modules
├── github
├── weather
├── news
├── markets
└── assistant

visualization
├── particles
├── shaders
└── audio

src-tauri
├── telemetry
├── integrations
└── services
```

That architecture keeps the codebase understandable while producing a meaningful development history for future Gource visualization.

See [`docs/gource-strategy.md`](docs/gource-strategy.md).

---

## Security

Do not commit:

- API keys
- access tokens
- credentials
- private environment files
- personal records
- treatment or health information

External integrations should use environment variables or OS-managed credential storage.

---

## Status

AAMUP OS is under active development and is not yet a stable 1.0 release.

Repository:

**https://github.com/aamup/aamup-os**
