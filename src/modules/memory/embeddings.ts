import { invoke } from '@tauri-apps/api/core'

export interface EmbeddingStatus {
  configured: boolean
  provider: string
  baseUrl: string
  model: string
  hasApiKey: boolean
}

export interface EmbeddingResponse {
  provider: string
  model: string
  embeddings: number[][]
}

export function getEmbeddingStatus() {
  return invoke<EmbeddingStatus>(
    'get_embedding_status',
  )
}

export function embedTexts(input: string[]) {
  return invoke<EmbeddingResponse>(
    'embed_texts',
    {
      request: {
        input,
      },
    },
  )
}
