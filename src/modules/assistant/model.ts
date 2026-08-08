import { invoke } from '@tauri-apps/api/core'

export interface AssistantModelStatus {
  configured: boolean
  provider: string
  baseUrl: string
  model: string
  hasApiKey: boolean
}

export interface AssistantModelResponse {
  provider: string
  model: string
  content: string
}

export function getAssistantModelStatus() {
  return invoke<AssistantModelStatus>(
    'get_assistant_model_status',
  )
}

export function queryAssistantModel(
  prompt: string,
  context?: string,
) {
  return invoke<AssistantModelResponse>(
    'query_assistant_model',
    {
      request: {
        prompt,
        context,
      },
    },
  )
}
