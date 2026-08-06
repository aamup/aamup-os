import { invoke } from '@tauri-apps/api/core'

export interface MarketQuote {
  symbol: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  exchange: string
  instrumentType: string
  sparkline: number[]
}

export interface MarketError {
  symbol: string
  message: string
}

export interface MarketsIntelligence {
  quotes: MarketQuote[]
  errors: MarketError[]
  source: string
}

export function getMarketsIntelligence() {
  return invoke<MarketsIntelligence>('get_markets_intelligence')
}
