# Daily Intelligence v0.5

Daily Intelligence is a grounded aggregator across existing AAMUP OS modules.

## Sources

- Weather
- Markets
- News
- GitHub
- Native system telemetry
- Recent local Memory Core records

Each source is fetched independently. A failed source produces a partial brief instead of failing the entire report.

## Commands

```text
brief
brief me
briefing
```

Natural-language examples:

```text
give me my daily brief
daily briefing
morning brief
```

## Navigation

```text
open briefing
open daily brief
```

## Grounding

v0.5 does not ask the language model to invent or summarize live facts. Report lines are constructed directly from module data. Model-assisted synthesis can be added later as an explicitly labeled layer.
