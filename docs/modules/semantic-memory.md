# Semantic Memory v0.7

v0.7 adds an optional OpenAI-compatible embedding adapter to Memory Core retrieval.

## Retrieval order

```text
Memory query
  ↓
Lexical relevance score
  ↓
Embedding provider configured?
  ├─ no  → lexical result
  └─ yes → batch embeddings + cosine similarity
              ↓
         hybrid ranking
```

If the embedding endpoint fails, AAMUP silently falls back to lexical retrieval.

## Configuration

The embedding endpoint defaults to `AAMUP_LLM_BASE_URL` when `AAMUP_EMBED_BASE_URL` is not set.

Required for semantic retrieval:

```bash
export AAMUP_EMBED_MODEL="<embedding-model-name>"
```

Optional separate endpoint:

```bash
export AAMUP_EMBED_BASE_URL="http://127.0.0.1:11434/v1"
```

Optional authentication:

```bash
export AAMUP_EMBED_API_KEY="<key>"
```

When embedding-specific authentication is absent, the adapter can reuse `AAMUP_LLM_API_KEY`.

## Diagnostics

```text
embedding
recall <query>
```

`embedding` reports whether semantic retrieval is configured.

`recall` reports the retrieval mode and, for hybrid results, cosine similarity.

## Data flow

v0.7 does not persist vectors. It embeds the current query plus up to 100 recent memory records in a single batch at retrieval time.

This keeps Memory Core portable and avoids schema migration while the memory set is still small.

A later milestone can cache vectors in SQLite and re-embed only when memories change.
