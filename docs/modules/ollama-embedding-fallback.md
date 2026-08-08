# Ollama Embedding Fallback

AAMUP semantic memory now supports two embedding protocols automatically.

## Resolution order

1. `${AAMUP_EMBED_BASE_URL}/embeddings`
2. If that route returns HTTP 404 or 405:
   - remove a trailing `/v1` from the configured base URL
   - call `/api/embed`

With:

```text
AAMUP_EMBED_BASE_URL=http://127.0.0.1:11434/v1
```

AAMUP tries:

```text
http://127.0.0.1:11434/v1/embeddings
```

and, when unavailable, automatically retries:

```text
http://127.0.0.1:11434/api/embed
```

This allows the chat model to continue using the OpenAI-compatible `/v1`
interface while semantic memory uses Ollama's native embedding API when needed.

The `embedding` health command performs a real request, so successful fallback
should report `STATE :: ONLINE`.
