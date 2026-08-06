import { invoke } from '@tauri-apps/api/core'

export interface WeatherCurrent {
  time: string
  temperature: number
  apparentTemperature: number
  humidity: number
  precipitation: number
  weatherCode: number
  windSpeed: number
  windDirection: number
  isDay: boolean
}

export interface WeatherHourly {
  time: string
  temperature: number
  precipitationProbability: number
  weatherCode: number
}

export interface WeatherDaily {
  date: string
  weatherCode: number
  high: number
  low: number
  precipitationProbability: number
  sunrise: string
  sunset: string
}

export interface WeatherIntelligence {
  locationLabel: string
  latitude: number
  longitude: number
  timezone: string
  current: WeatherCurrent
  hourly: WeatherHourly[]
  daily: WeatherDaily[]
}

export function getWeatherIntelligence() {
  return invoke<WeatherIntelligence>('get_weather_intelligence')
}
