import { invoke } from '@tauri-apps/api/core'

export interface MemoryEntry {
  id: number
  content: string
  category: string
  createdAt: string
  updatedAt: string
}

export function rememberMemory(
  content: string,
  category = 'general',
) {
  return invoke<MemoryEntry>('remember_memory', {
    request: {
      content,
      category,
    },
  })
}

export function listMemories(limit = 50) {
  return invoke<MemoryEntry[]>('list_memories', {
    limit,
  })
}

export function searchMemories(
  query: string,
  limit = 50,
) {
  return invoke<MemoryEntry[]>('search_memories', {
    query,
    limit,
  })
}

export function forgetMemory(id: number) {
  return invoke<boolean>('forget_memory', {
    id,
  })
}

export type MemoryCandidateStatus =
  | 'pending'
  | 'approved'
  | 'rejected'

export interface MemoryCandidate {
  id: number
  content: string
  category: string
  confidence: number
  sourceSessionId: string
  status: MemoryCandidateStatus
  createdAt: string
  reviewedAt: string | null
}

export interface MemoryReviewResult {
  candidate: MemoryCandidate
  memoryId: number | null
  promoted: boolean
}

export function createMemoryCandidate(
  content: string,
  category: string,
  confidence: number,
  sourceSessionId: string,
) {
  return invoke<MemoryCandidate | null>(
    'create_memory_candidate',
    {
      request: {
        content,
        category,
        confidence,
        sourceSessionId,
      },
    },
  )
}

export function listMemoryCandidates(
  status: MemoryCandidateStatus | 'all' = 'pending',
  limit = 50,
) {
  return invoke<MemoryCandidate[]>(
    'list_memory_candidates',
    {
      status,
      limit,
    },
  )
}

export function reviewMemoryCandidate(
  id: number,
  decision: 'approve' | 'reject',
) {
  return invoke<MemoryReviewResult>(
    'review_memory_candidate',
    {
      id,
      decision,
    },
  )
}
