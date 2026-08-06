# AAMUP // OS

**AAMUP OS** is a modular personal intelligence system and desktop command center. The project is intentionally structured as a collection of independent subsystems so it can grow from a personal dashboard into a customizable platform without hard-coding the brand or purpose into every feature.

## v0.1.0 — Command Center Shell

The first milestone establishes the visual language and software boundaries:

- Responsive command-center interface
- Centralized brand configuration
- Module registry
- Demo telemetry stream
- Activity and status panels
- Interactive command bar
- No external services and no secrets
- Architecture designed for later Tauri/Rust integration

> The current telemetry is simulated UI data. Real host telemetry will be introduced when the Tauri backend is added.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Build

```bash
npm run typecheck
npm run build
```

## Planned architecture

```text
src/
├── app/                 Application composition
├── components/          Reusable interface components
├── core/
│   ├── config/          Brand and runtime configuration
│   ├── modules/         Module registry
│   └── types/           Core contracts
├── hooks/               Frontend runtime hooks
└── styles/              Design system and global styling

src-tauri/               Native Rust backend — next milestone
modules/                  Larger integration modules — future milestone
visualization/            GPU/audio/data visualization — future milestone
services/                 APIs, sockets, caching — future milestone
```

## Roadmap

- **v0.1** Command center shell
- **v0.2** Tauri desktop wrapper and real system telemetry
- **v0.3** Event bus and command router
- **v0.4** GitHub intelligence module
- **v0.5** Weather module
- **v0.6** News and market modules
- **v0.7** Audio/visualization engine
- **v0.8** Assistant interface
- **v0.9** Plugin SDK and theming
- **v1.0** Stable personal intelligence platform

## Git history philosophy

AAMUP OS is being built with coherent, feature-level commits. That keeps the repository understandable for engineers and produces a meaningful Gource visualization later without artificial commit inflation.

## Security

Never commit API keys, access tokens, credentials, personal records, or private environment files. Use local environment variables or OS-managed credential storage as integrations are added.
