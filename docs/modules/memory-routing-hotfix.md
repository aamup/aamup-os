# Memory Routing + Embedding Health Hotfix

This patch resolves an ambiguity between two meanings of "memory":

1. Memory Core: persisted user facts, preferences, and decisions.
2. System memory: RAM utilization.

## Routing

A conversational use of the word `memory` no longer routes to System Telemetry.

System telemetry still wins for explicit RAM requests such as:

```text
how much RAM am I using
show memory usage
system memory usage
how much memory is available on this computer
```

Conversational requests such as:

```text
why is there no relevant memory
what do you remember about the project
ChatGPT says there is relevant memory
```

are allowed to continue to Memory/Assistant behavior instead of being hijacked by System Telemetry.

## Embedding health

The `embedding` command now performs a real one-text embedding request.

Possible states:

```text
STATE :: ONLINE
STATE :: ERROR
STATE :: DISABLED
```

A non-empty model environment variable is no longer sufficient to imply that the provider is usable.

## Important data boundary

ChatGPT memory and AAMUP OS Memory Core are separate stores.

A fact discussed in ChatGPT is not automatically present in AAMUP OS. To persist it in AAMUP OS, use:

```text
remember <fact>
```

Then verify:

```text
memory
recall <semantic query>
```
