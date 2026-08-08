# Memory Core v0.4

Memory Core provides persistent local storage for facts, preferences, and decisions.

## Storage

Memory is stored in a SQLite database named `memory.db` under the Tauri application data directory. The database is not stored in the Git repository.

## Commands

```text
remember <text>
memory
memory <search text>
forget <id>
```

Examples:

```text
remember AAMUP OS should use a black white and red visual system
memory
memory visual system
forget 3
```

## Dashboard

Open the Memory module from the module rail or use:

```text
open memory
```

The dashboard supports adding, searching, listing, and deleting memories.

## v0.4 boundaries

This milestone provides durable storage and retrieval. Automatic model-context injection, semantic embeddings, and ranking belong to later Memory milestones.
