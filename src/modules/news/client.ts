import { invoke } from '@tauri-apps/api/core'

export type NewsCategory = 'LOCAL' | 'AI' | 'TECH'

export interface NewsArticle {
  category: NewsCategory
  title: string
  source: string
  url: string
  published: string
}

export interface NewsFeedError {
  category: string
  message: string
}

export interface NewsIntelligence {
  articles: NewsArticle[]
  errors: NewsFeedError[]
  feedCount: number
  source: string
}

export function getNewsIntelligence() {
  return invoke<NewsIntelligence>('get_news_intelligence')
}
