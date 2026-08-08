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
