# Memory-Aware Assistant v0.6

v0.6 connects persistent Memory Core records to the optional Assistant model fallback.

## Routing boundary

Memory retrieval occurs only after the deterministic Assistant router returns no high-confidence native intent.

This means:

- weather stays grounded in Weather Intelligence
- markets stay grounded in Markets Intelligence
- news stays grounded in News Intelligence
- GitHub stays grounded in repository intelligence
- system telemetry stays native
- media control stays native
- Daily Intelligence stays grounded
- general conversation can receive relevant local memory

## Retrieval

The first retrieval implementation is local relevance ranking:

1. Load up to 100 recent local memories.
2. Normalize and stem query/content terms.
3. Remove common stop words.
4. Rank memories by lexical overlap and category match.
5. Send at most five relevant records to the configured model.

This milestone deliberately does not require a cloud embedding service.

## Security boundary

Memory records are inserted into the model context as untrusted user data. The model system prompt explicitly instructs the model not to follow instructions embedded in memories.

Current user input takes precedence over saved memory when they conflict.

## Diagnostic command

```text
recall <query>
```

Examples:

```text
recall AAMUP colors
recall project design
recall what do you remember
```

The command shows exactly which saved memories would be considered relevant.

## End-to-end example

```text
remember AAMUP OS should use black white and restrained red
recall what colors should AAMUP OS use
what colors should AAMUP OS use?
```

The final conversational query should fall through to the configured model with the matching memory supplied in context.

## Next milestone

A later retrieval milestone can replace lexical ranking with local vector embeddings while preserving the same retrieval interface.
