# Markets Intelligence

Markets Intelligence is the third live external-data module in AAMUP OS.

## Default watchlist

```text
SPY
QQQ
AAPL
NVDA
BTC-USD
ETH-USD
```

The watchlist intentionally mixes index ETFs, individual equities, and digital assets.

## Data path

```text
Markets Dashboard / markets command
             ↓
TypeScript client
             ↓
Tauri IPC
             ↓
Rust markets service
             ↓
Market chart feed
```

## Current capabilities

- current market price
- previous close
- absolute session change
- percentage session change
- exchange
- instrument type
- intraday sparkline
- advancing-symbol count
- session leader
- session laggard
- partial-failure handling
- five-minute UI refresh cadence

## Configure symbols

Override the default symbols at runtime:

```bash
export AAMUP_MARKET_SYMBOLS="SPY,QQQ,AAPL,MSFT,NVDA,BTC-USD,ETH-USD"
npm run tauri dev
```

A maximum of 12 symbols is accepted.

## Commands

```text
markets
market
stocks
crypto
```

## Planned

- editable watchlists in the UI
- persisted portfolio configuration
- market-session state
- extended time ranges
- portfolio positions
- realized/unrealized performance
- alerts
