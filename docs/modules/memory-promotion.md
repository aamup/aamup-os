# Reviewed Memory Promotion v0.9

v0.9 adds a review-first bridge between persistent conversation summaries and permanent Memory Core.

## Pipeline

```text
conversation
  -> v0.8 session summary
  -> local Qwen candidate extraction
  -> deterministic validation
  -> memory_candidates queue
  -> explicit user review
  -> permanent memories table
```

Nothing is automatically promoted to permanent Memory Core in v0.9.

## Candidate generation

Candidate extraction runs only when v0.8 creates a session summary:

- every 6 user turns
- explicit `clear context`
- Assistant dashboard `CLEAR SESSION`

The extractor returns at most four candidate memories and must classify each as:

- `preference`
- `project`
- `goal`
- `constraint`
- `decision`
- `identity`
- `general`

Candidates below 0.75 confidence are discarded before storage.

## Exclusions

The extraction prompt excludes:

- temporary status
- one-time actions
- guesses
- assistant claims
- live data
- passwords and credentials
- API keys and tokens
- medical diagnoses
- financial account details
- legal case specifics
- precise addresses
- private third-party facts

A deterministic post-filter also rejects obvious secret/credential patterns.

## Review commands

```text
memory candidates
memory approve 3
memory reject 3
memory promote 3
```

`promote` is an alias for `approve`.

## Atomic approval

Approval uses one SQLite transaction:

1. load pending candidate
2. check permanent-memory duplicate
3. insert permanent memory if needed
4. mark candidate approved
5. commit

A failed transaction does not partially promote a candidate.

## Duplicate handling

Candidate content receives a normalized unique key. Exact normalized duplicates are not queued repeatedly.

If the same content is already permanent memory, candidate creation is skipped.

## Status retention

Rejected and approved candidates remain in the candidate table for auditability rather than being deleted.

## Auto-promotion

Automatic high-confidence promotion is intentionally disabled in v0.9.

A later version may optionally support a user-configurable threshold after the review queue has demonstrated acceptable precision.
