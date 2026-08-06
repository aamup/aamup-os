import { invoke } from '@tauri-apps/api/core'

export interface GitRepositoryState {
  branch: string
  headShort: string
  headMessage: string
  commitCount: number
  changedFiles: number
  ahead: number
  behind: number
  remote: string | null
  clean: boolean
}

export async function getGitRepositoryState() {
  return invoke<GitRepositoryState>('get_git_repository_state')
}
