# AAMUP Developer Harness

The repository-root `./aamup` command is the standard local development entrypoint.

## One-time setup

```bash
./aamup setup
```

This creates:

```text
~/.config/aamup-os/dev.env
```

with mode `600` when the file does not already exist. Existing configuration is preserved.

## Daily workflow

```bash
./aamup doctor
./aamup dev
```

## Fast development loop

After an edit:

```bash
./aamup check
```

This runs TypeScript typechecking and `cargo check`.

## Full verification

Before shipping:

```bash
./aamup verify
```

This runs:

- `npm run typecheck`
- `npm run build`
- `cargo fmt -- --check`
- `cargo check`
- `cargo clippy --all-targets --all-features -- -D warnings`

## Ship

```bash
./aamup ship "feat: describe the change"
```

`ship`:

1. Runs full verification.
2. Shows the diff summary.
3. Stages project changes.
4. Rejects common secret/key file patterns.
5. Commits.
6. Pushes the current branch.

## Diagnostics

```bash
./aamup doctor
```

Doctor checks:

- Git repository and origin
- Node/npm
- Rust/cargo
- Python/curl
- Ollama installation and server reachability
- local config file and permissions
- configured chat model
- configured embedding model
- actual chat-completion request
- actual native Ollama embedding request

## Sync

```bash
./aamup sync
```

This performs a fast-forward-only pull and refuses to run with a dirty working tree.

## Configuration

Default local configuration:

```text
~/.config/aamup-os/dev.env
```

Override the path when needed:

```bash
AAMUP_ENV_FILE=/path/to/dev.env ./aamup dev
```

The configuration file stays outside the repository.
