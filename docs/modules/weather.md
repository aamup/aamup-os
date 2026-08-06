# Weather Intelligence

Weather Intelligence is the second live data module in AAMUP OS.

## Data path

```text
Module UI / weather command
        ↓
TypeScript client
        ↓
Tauri IPC
        ↓
Rust weather service
        ↓
Open-Meteo forecast API
```

## Current capabilities

- current temperature
- apparent temperature
- humidity
- precipitation
- wind speed and direction
- weather condition code
- daylight state
- 12-hour temperature outlook
- 12-hour precipitation probability
- seven-day high / low forecast
- seven-day precipitation probability
- sunrise and sunset
- configurable coordinates

## Configuration

The default location can be overridden at runtime:

```bash
export AAMUP_WEATHER_LABEL="MY LOCATION"
export AAMUP_WEATHER_LAT="45.5152"
export AAMUP_WEATHER_LON="-122.6784"
npm run tauri dev
```

No API key is required.

## Commands

```text
weather
wx
```

## Module navigation

GitHub Intelligence and Weather Intelligence are selectable from the left module rail.

Planned modules remain visible but disabled until their backend is implemented.
