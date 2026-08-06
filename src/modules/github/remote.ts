import { invoke } from '@tauri-apps/api/core'

export interface GitHubRepositorySummary {
  fullName: string
  description: string
  htmlUrl: string
  defaultBranch: string
  visibility: string
  stars: number
  forks: number
  openItems: number
  pushedAt: string
}

export interface GitHubCommitSummary {
  sha: string
  message: string
  author: string
  date: string
  htmlUrl: string
}

export interface GitHubIssueSummary {
  number: number
  title: string
  htmlUrl: string
}

export interface GitHubPullRequestSummary {
  number: number
  title: string
  htmlUrl: string
  draft: boolean
}

export interface GitHubWorkflowSummary {
  name: string
  status: string
  conclusion: string
  branch: string
  event: string
  htmlUrl: string
  createdAt: string
}

export interface GitHubRemoteState {
  repository: GitHubRepositorySummary
  recentCommits: GitHubCommitSummary[]
  openIssues: GitHubIssueSummary[]
  openPullRequests: GitHubPullRequestSummary[]
  latestWorkflow: GitHubWorkflowSummary | null
  rateLimitRemaining: number | null
}

export async function getGitHubRemoteState() {
  return invoke<GitHubRemoteState>('get_github_remote_state')
}
