import { invoke } from '@tauri-apps/api/core'

export type ConversationRole = 'user' | 'assistant'

export interface ConversationTurn {
  id: number
  sessionId: string
  role: ConversationRole
  content: string
  intent: string | null
  createdAt: string
}

export interface ConversationSummary {
  id: number
  sessionId: string
  summary: string
  turnCount: number
  createdAt: string
}

export function recordConversationTurn(
  sessionId: string,
  role: ConversationRole,
  content: string,
  intent?: string | null,
) {
  return invoke<ConversationTurn>(
    'record_conversation_turn',
    {
      request: {
        sessionId,
        role,
        content,
        intent: intent ?? null,
      },
    },
  )
}

export function listConversationTurns(
  sessionId?: string | null,
  limit = 20,
) {
  return invoke<ConversationTurn[]>(
    'list_conversation_turns',
    {
      sessionId: sessionId ?? null,
      limit,
    },
  )
}

export function saveConversationSummary(
  sessionId: string,
  summary: string,
  turnCount: number,
) {
  return invoke<ConversationSummary>(
    'save_conversation_summary',
    {
      request: {
        sessionId,
        summary,
        turnCount,
      },
    },
  )
}

export function listConversationSummaries(
  limit = 20,
) {
  return invoke<ConversationSummary[]>(
    'list_conversation_summaries',
    { limit },
  )
}
