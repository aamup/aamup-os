# Memory Promotion v0.9.1

v0.9.1 fixes two observability and parsing problems in reviewed memory promotion.

## Flexible candidate parsing

The candidate parser now accepts:

```text
MEMORY | 0.92 | preference | User prefers local-first features.
MEMORY    0.92    preference    User prefers local-first features.
MEMORY\t0.92\tpreference\tUser prefers local-first features.
```

Confidence may also be expressed as a percentage, such as `92%`.

The accepted threshold is 0.70.

## Manual rescan

Use:

```text
memory scan
```

This reprocesses the latest saved conversation summary and reports:

- summary ID
- parsed candidate count
- newly queued candidate count
- abbreviated raw model output when parsing produced zero candidates

This allows diagnosis without recreating a conversation.

## Candidate diagnostics

Use:

```text
memory candidate-status
```

This reports pending candidate count and whether a recent conversation summary exists.

## Truthful clear-context response

`clear context` now distinguishes between:

```text
Conversation summary created and context reset.
```

and:

```text
Context reset. No new summary was created for this session.
```

Previously it always claimed that a summary was created.
