# Assistant Core

Assistant Core v0.1 is a local natural-language intent router over AAMUP OS modules.

It does not currently use a cloud language model.

## Why local first

The first milestone proves the routing architecture before adding a model dependency:

```text
User request
    ↓
Local intent normalization
    ↓
Deterministic module routing
    ↓
Live module client
    ↓
Structured response
```

This means all answers come from existing AAMUP OS data paths rather than fabricated assistant text.

## Supported intents

- weather and forecast
- markets, stocks, and crypto
- local / AI / technology news
- GitHub / repository / CI status
- system telemetry
- MPRIS now-playing
- play-pause / next / previous media controls

## Examples

```text
What is the weather?
Will it rain?
Show me the markets.
Latest AI news.
Repository status.
How is the system doing?
What is playing?
Pause the music.
Next song.
```

## Command interface

```text
ask what is the weather
ask show me the markets
ask latest local news
ask repository status
ask what is playing
ask next song
```

Aliases:

```text
assistant
query
```

## Next milestones

- conversational context
- module-navigation actions
- configurable local/cloud model adapter
- OpenAI-compatible provider interface
- safe tool execution policy
- persisted preferences
- reminders and workflow actions

## v0.2 — Context and navigation

Assistant Core v0.2 adds a persistent local session layer around the deterministic v0.1 router.

It remembers the last intent, module, news category, and turn count. The dashboard persists
recent history and context locally.

Examples:

```text
What is the weather?
What about tomorrow?

Latest AI news.
Show me more.

Open markets.
Open GitHub.
Open audio.
```

Navigation requests now emit an AAMUP OS navigation action and switch the center module.

Context can be cleared with the dashboard control or:

```text
clear context
reset context
forget context
```

## v0.2 — Context and navigation

Assistant Core v0.2 adds a persistent local session layer around the deterministic v0.1 router.

It remembers the last intent, module, news category, and turn count. The dashboard persists
recent history and context locally.

Examples:

```text
What is the weather?
What about tomorrow?

Latest AI news.
Show me more.

Open markets.
Open GitHub.
Open audio.
```

Navigation requests now emit an AAMUP OS navigation action and switch the center module.

Context can be cleared with the dashboard control or:

```text
clear context
reset context
forget context
```
