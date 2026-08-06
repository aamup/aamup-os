use serde::Deserialize;

const DEFAULT_LATITUDE: f64 = 45.5152;
const DEFAULT_LONGITUDE: f64 = -122.6784;
const DEFAULT_LABEL: &str = "PORTLAND METRO";

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherCurrent {
    time: String,
    temperature: f64,
    apparent_temperature: f64,
    humidity: f64,
    precipitation: f64,
    weather_code: u16,
    wind_speed: f64,
    wind_direction: f64,
    is_day: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherHourly {
    time: String,
    temperature: f64,
    precipitation_probability: f64,
    weather_code: u16,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherDaily {
    date: String,
    weather_code: u16,
    high: f64,
    low: f64,
    precipitation_probability: f64,
    sunrise: String,
    sunset: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherIntelligence {
    location_label: String,
    latitude: f64,
    longitude: f64,
    timezone: String,
    current: WeatherCurrent,
    hourly: Vec<WeatherHourly>,
    daily: Vec<WeatherDaily>,
}

#[derive(Deserialize)]
struct ApiCurrent {
    time: String,
    temperature_2m: f64,
    relative_humidity_2m: f64,
    apparent_temperature: f64,
    is_day: u8,
    precipitation: f64,
    weather_code: u16,
    wind_speed_10m: f64,
    wind_direction_10m: f64,
}

#[derive(Deserialize)]
struct ApiHourly {
    time: Vec<String>,
    temperature_2m: Vec<f64>,
    precipitation_probability: Vec<f64>,
    weather_code: Vec<u16>,
}

#[derive(Deserialize)]
struct ApiDaily {
    time: Vec<String>,
    weather_code: Vec<u16>,
    temperature_2m_max: Vec<f64>,
    temperature_2m_min: Vec<f64>,
    precipitation_probability_max: Vec<f64>,
    sunrise: Vec<String>,
    sunset: Vec<String>,
}

#[derive(Deserialize)]
struct ApiResponse {
    latitude: f64,
    longitude: f64,
    timezone: String,
    current: ApiCurrent,
    hourly: ApiHourly,
    daily: ApiDaily,
}

fn env_number(name: &str, fallback: f64) -> f64 {
    std::env::var(name)
        .ok()
        .and_then(|value| value.parse::<f64>().ok())
        .unwrap_or(fallback)
}

fn location_label() -> String {
    std::env::var("AAMUP_WEATHER_LABEL").unwrap_or_else(|_| DEFAULT_LABEL.to_string())
}

fn current_hour_index(times: &[String], current_time: &str) -> usize {
    times
        .iter()
        .position(|time| time.as_str() >= current_time)
        .unwrap_or(0)
}

#[tauri::command]
pub async fn get_weather_intelligence() -> Result<WeatherIntelligence, String> {
    let latitude = env_number("AAMUP_WEATHER_LAT", DEFAULT_LATITUDE);
    let longitude = env_number("AAMUP_WEATHER_LON", DEFAULT_LONGITUDE);

    let client = reqwest::Client::builder()
        .user_agent("AAMUP-OS-Weather-Intelligence")
        .build()
        .map_err(|error| format!("unable to create weather client: {error}"))?;

    let response = client
        .get("https://api.open-meteo.com/v1/forecast")
        .query(&[
            ("latitude", latitude.to_string()),
            ("longitude", longitude.to_string()),
            (
                "current",
                "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m".to_string(),
            ),
            (
                "hourly",
                "temperature_2m,precipitation_probability,weather_code".to_string(),
            ),
            (
                "daily",
                "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset".to_string(),
            ),
            ("temperature_unit", "fahrenheit".to_string()),
            ("wind_speed_unit", "mph".to_string()),
            ("precipitation_unit", "inch".to_string()),
            ("timezone", "auto".to_string()),
            ("forecast_days", "7".to_string()),
        ])
        .send()
        .await
        .map_err(|error| format!("weather request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("weather API returned an error: {error}"))?
        .json::<ApiResponse>()
        .await
        .map_err(|error| format!("invalid weather response: {error}"))?;

    let start = current_hour_index(&response.hourly.time, &response.current.time);
    let end = (start + 12).min(response.hourly.time.len());

    let hourly = (start..end)
        .filter_map(|index| {
            Some(WeatherHourly {
                time: response.hourly.time.get(index)?.clone(),
                temperature: *response.hourly.temperature_2m.get(index)?,
                precipitation_probability: *response.hourly.precipitation_probability.get(index)?,
                weather_code: *response.hourly.weather_code.get(index)?,
            })
        })
        .collect::<Vec<_>>();

    let daily_len = [
        response.daily.time.len(),
        response.daily.weather_code.len(),
        response.daily.temperature_2m_max.len(),
        response.daily.temperature_2m_min.len(),
        response.daily.precipitation_probability_max.len(),
        response.daily.sunrise.len(),
        response.daily.sunset.len(),
    ]
    .into_iter()
    .min()
    .unwrap_or(0);

    let daily = (0..daily_len)
        .map(|index| WeatherDaily {
            date: response.daily.time[index].clone(),
            weather_code: response.daily.weather_code[index],
            high: response.daily.temperature_2m_max[index],
            low: response.daily.temperature_2m_min[index],
            precipitation_probability: response.daily.precipitation_probability_max[index],
            sunrise: response.daily.sunrise[index].clone(),
            sunset: response.daily.sunset[index].clone(),
        })
        .collect::<Vec<_>>();

    Ok(WeatherIntelligence {
        location_label: location_label(),
        latitude: response.latitude,
        longitude: response.longitude,
        timezone: response.timezone,
        current: WeatherCurrent {
            time: response.current.time,
            temperature: response.current.temperature_2m,
            apparent_temperature: response.current.apparent_temperature,
            humidity: response.current.relative_humidity_2m,
            precipitation: response.current.precipitation,
            weather_code: response.current.weather_code,
            wind_speed: response.current.wind_speed_10m,
            wind_direction: response.current.wind_direction_10m,
            is_day: response.current.is_day == 1,
        },
        hourly,
        daily,
    })
}
