use serde::Deserialize;

const DEFAULT_SYMBOLS: &[&str] = &["SPY", "QQQ", "AAPL", "NVDA", "BTC-USD", "ETH-USD"];

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketQuote {
    symbol: String,
    price: f64,
    previous_close: f64,
    change: f64,
    change_percent: f64,
    currency: String,
    exchange: String,
    instrument_type: String,
    sparkline: Vec<f64>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketError {
    symbol: String,
    message: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketsIntelligence {
    quotes: Vec<MarketQuote>,
    errors: Vec<MarketError>,
    source: String,
}

#[derive(Deserialize)]
struct YahooChartResponse {
    chart: YahooChart,
}

#[derive(Deserialize)]
struct YahooChart {
    result: Option<Vec<YahooResult>>,
    error: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct YahooResult {
    meta: YahooMeta,
    indicators: YahooIndicators,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YahooMeta {
    symbol: String,
    currency: Option<String>,
    exchange_name: Option<String>,
    instrument_type: Option<String>,
    regular_market_price: Option<f64>,
    chart_previous_close: Option<f64>,
    previous_close: Option<f64>,
}

#[derive(Deserialize)]
struct YahooIndicators {
    quote: Vec<YahooQuoteSeries>,
}

#[derive(Deserialize)]
struct YahooQuoteSeries {
    close: Vec<Option<f64>>,
}

fn configured_symbols() -> Vec<String> {
    std::env::var("AAMUP_MARKET_SYMBOLS")
        .ok()
        .map(|value| {
            value
                .split(',')
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_uppercase)
                .take(12)
                .collect::<Vec<_>>()
        })
        .filter(|symbols| !symbols.is_empty())
        .unwrap_or_else(|| {
            DEFAULT_SYMBOLS
                .iter()
                .map(|value| value.to_string())
                .collect()
        })
}

fn compact_sparkline(values: &[Option<f64>]) -> Vec<f64> {
    let clean = values.iter().filter_map(|value| *value).collect::<Vec<_>>();

    if clean.len() <= 32 {
        return clean;
    }

    let step = clean.len() as f64 / 32.0;

    (0..32)
        .filter_map(|index| {
            let source_index = ((index as f64) * step).floor() as usize;
            clean.get(source_index).copied()
        })
        .collect()
}

async fn fetch_quote(client: &reqwest::Client, symbol: &str) -> Result<MarketQuote, String> {
    let encoded = symbol.replace('^', "%5E");
    let url = format!("https://query1.finance.yahoo.com/v8/finance/chart/{encoded}");

    let response = client
        .get(url)
        .query(&[
            ("range", "1d"),
            ("interval", "5m"),
            ("includePrePost", "false"),
            ("events", "div,splits"),
        ])
        .send()
        .await
        .map_err(|error| format!("market request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("market API returned an error: {error}"))?
        .json::<YahooChartResponse>()
        .await
        .map_err(|error| format!("invalid market response: {error}"))?;

    if let Some(error) = response.chart.error {
        return Err(format!("Yahoo chart error: {error}"));
    }

    let result = response
        .chart
        .result
        .and_then(|mut values| values.drain(..).next())
        .ok_or_else(|| "market response contained no result".to_string())?;

    let previous_close = result
        .meta
        .chart_previous_close
        .or(result.meta.previous_close)
        .unwrap_or(0.0);

    let sparkline = result
        .indicators
        .quote
        .first()
        .map(|series| compact_sparkline(&series.close))
        .unwrap_or_default();

    let price = result
        .meta
        .regular_market_price
        .or_else(|| sparkline.last().copied())
        .unwrap_or(0.0);

    let change = price - previous_close;
    let change_percent = if previous_close.abs() > f64::EPSILON {
        (change / previous_close) * 100.0
    } else {
        0.0
    };

    Ok(MarketQuote {
        symbol: result.meta.symbol,
        price,
        previous_close,
        change,
        change_percent,
        currency: result.meta.currency.unwrap_or_else(|| "USD".to_string()),
        exchange: result
            .meta
            .exchange_name
            .unwrap_or_else(|| "UNKNOWN".to_string()),
        instrument_type: result
            .meta
            .instrument_type
            .unwrap_or_else(|| "UNKNOWN".to_string()),
        sparkline,
    })
}

#[tauri::command]
pub async fn get_markets_intelligence() -> Result<MarketsIntelligence, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 AAMUP-OS-Markets-Intelligence/0.1")
        .build()
        .map_err(|error| format!("unable to create markets client: {error}"))?;

    let mut quotes = Vec::new();
    let mut errors = Vec::new();

    for symbol in configured_symbols() {
        match fetch_quote(&client, &symbol).await {
            Ok(quote) => quotes.push(quote),
            Err(message) => errors.push(MarketError { symbol, message }),
        }
    }

    if quotes.is_empty() {
        let detail = errors
            .first()
            .map(|error| format!("{}: {}", error.symbol, error.message))
            .unwrap_or_else(|| "no market data returned".to_string());

        return Err(detail);
    }

    Ok(MarketsIntelligence {
        quotes,
        errors,
        source: "Yahoo Finance chart feed".to_string(),
    })
}
