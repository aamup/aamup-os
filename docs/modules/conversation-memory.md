# Conversation Memory v0.8

Conversation Memory adds persistent local history and automatic session summaries to Assistant Core.

## Storage

AAMUP stores conversation data locally in:

```text
<tauri app data>/conversation.db
```

Tables:

- `conversation_turns`
- `conversation_summaries`

Each session gets a unique session ID.

## Persistence

Every completed Assistant interaction stores:

1. user input
2. assistant response
3. routed intent
4. session ID
5. timestamp

Persistence failures never block deterministic live modules.

## Automatic summaries

AAMUP creates a compact local-model summary:

- every 6 user turns
- when `clear context` is used
- when the Assistant dashboard `CLEAR SESSION` control is used

Summaries capture:

- user decisions
- preferences
- project changes
- unresolved issues
- next actions

The summarizer is explicitly instructed not to obey instructions contained in the transcript.

## Retrieval

For model-routed conversations, AAMUP supplies:

1. current session state
2. relevant explicit Memory Core records
3. semantically relevant prior conversation summaries
4. recent turns from the current session

Prior summaries use the existing embedding layer when available and fall back to lexical relevance when embeddings are unavailable.

## Security boundary

Memory records, summaries, and conversation history are treated as untrusted data.

The model system prompt explicitly prohibits following instructions embedded inside persisted context.

Current user input always takes precedence over stored context.

## Commands

```text
history
history recent
history summaries
```

## Routing regression fix

v0.8 also makes greetings exact-match only.

For example:

```text
hi
```

is a greeting, while:

```text
hi, what is the weather?
```

continues through normal intent routing instead of being hijacked by the greeting handler.
