import { useGitHubIntelligence } from '../hooks/useGitHubIntelligence'
import '../styles/github-dashboard.css'

function shortDate(value: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ciState(
  status?: string,
  conclusion?: string,
) {
  if (!status) return 'UNKNOWN'
  if (status !== 'completed') return status.toUpperCase()
  return (conclusion || 'UNKNOWN').toUpperCase()
}

export function GitHubDashboard() {
  const {
    remote,
    local,
    status,
    lastUpdated,
    error,
    refresh,
  } = useGitHubIntelligence()

  const repo = remote?.repository
  const workflow = remote?.latestWorkflow
  const commits = remote?.recentCommits ?? []

  return (
    <main className="github-dashboard">
      <div className="github-dashboard__grid" />

      <header className="github-dashboard__header">
        <div>
          <span className="github-dashboard__eyebrow">
            GITHUB INTELLIGENCE / LIVE
          </span>
          <h1>
            {repo?.fullName ?? 'aamup/aamup-os'}
          </h1>
          <p>
            {repo?.description
              ?? 'REMOTE REPOSITORY INTELLIGENCE'}
          </p>
        </div>

        <div className="github-dashboard__controls">
          <div
            className={`github-live github-live--${status}`}
          >
            <i />
            {status === 'loading'
              ? 'SYNCING'
              : status === 'live'
                ? 'REMOTE LIVE'
                : 'LOCAL FALLBACK'}
          </div>

          <button
            className="github-refresh"
            type="button"
            onClick={() => void refresh()}
          >
            REFRESH
          </button>
        </div>
      </header>

      <section className="github-kpis">
        <article>
          <span>BRANCH</span>
          <strong>
            {local?.branch ?? repo?.defaultBranch ?? '—'}
          </strong>
          <small>
            {local?.headShort
              ? `HEAD ${local.headShort}`
              : 'REMOTE'}
          </small>
        </article>

        <article>
          <span>CI STATUS</span>
          <strong
            className={
              workflow?.conclusion === 'success'
                ? 'github-positive'
                : ''
            }
          >
            {ciState(
              workflow?.status,
              workflow?.conclusion,
            )}
          </strong>
          <small>{workflow?.name ?? 'NO RUN'}</small>
        </article>

        <article>
          <span>COMMITS</span>
          <strong>{local?.commitCount ?? '—'}</strong>
          <small>
            {local?.clean ? 'TREE CLEAN' : 'TREE DIRTY'}
          </small>
        </article>

        <article>
          <span>OPEN</span>
          <strong>
            {(remote?.openIssues.length ?? 0)
              + (remote?.openPullRequests.length ?? 0)}
          </strong>
          <small>
            {remote?.openIssues.length ?? 0} ISSUES /{' '}
            {remote?.openPullRequests.length ?? 0} PRS
          </small>
        </article>
      </section>

      <div className="github-dashboard__main">
        <section className="github-commit-panel">
          <div className="github-section-title">
            <span>RECENT COMMITS</span>
            <small>
              {commits.length
                ? `${commits.length} REMOTE EVENTS`
                : 'WAITING FOR DATA'}
            </small>
          </div>

          <div className="github-commit-stream">
            {commits.length === 0 ? (
              <div className="github-empty">
                {status === 'loading'
                  ? 'SYNCHRONIZING WITH GITHUB...'
                  : 'NO COMMIT DATA AVAILABLE'}
              </div>
            ) : (
              commits.map((commit, index) => (
                <article
                  className="github-commit"
                  key={commit.sha}
                >
                  <div className="github-commit__rail">
                    <i />
                    {index < commits.length - 1 && <span />}
                  </div>

                  <div className="github-commit__body">
                    <div className="github-commit__meta">
                      <code>{commit.sha}</code>
                      <time>{shortDate(commit.date)}</time>
                    </div>

                    <strong>{commit.message}</strong>
                    <small>{commit.author || 'UNKNOWN AUTHOR'}</small>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="github-side-stack">
          <section className="github-mini-panel">
            <div className="github-section-title">
              <span>REPOSITORY</span>
            </div>

            <dl>
              <div>
                <dt>VISIBILITY</dt>
                <dd>
                  {repo?.visibility?.toUpperCase() ?? '—'}
                </dd>
              </div>
              <div>
                <dt>DEFAULT</dt>
                <dd>{repo?.defaultBranch ?? '—'}</dd>
              </div>
              <div>
                <dt>STARS</dt>
                <dd>{repo?.stars ?? '—'}</dd>
              </div>
              <div>
                <dt>FORKS</dt>
                <dd>{repo?.forks ?? '—'}</dd>
              </div>
              <div>
                <dt>API LEFT</dt>
                <dd>{remote?.rateLimitRemaining ?? '—'}</dd>
              </div>
              <div>
                <dt>UPDATED</dt>
                <dd>
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="github-mini-panel">
            <div className="github-section-title">
              <span>LOCAL STATE</span>
            </div>

            <div className="github-local-state">
              <div>
                <span>SYNC</span>
                <strong>
                  +{local?.ahead ?? 0} / -{local?.behind ?? 0}
                </strong>
              </div>

              <div>
                <span>CHANGED</span>
                <strong>{local?.changedFiles ?? '—'}</strong>
              </div>

              <div className="github-local-state__wide">
                <span>ORIGIN</span>
                <code>
                  {local?.remote
                    ?.replace('https://github.com/', '')
                    .replace('.git', '')
                    ?? 'NOT CONFIGURED'}
                </code>
              </div>
            </div>
          </section>

          <section className="github-mini-panel github-ci-panel">
            <div className="github-section-title">
              <span>WORKFLOW</span>
            </div>

            <div className="github-ci-orb">
              <div
                className={
                  workflow?.conclusion === 'success'
                    ? 'github-ci-orb__core github-ci-orb__core--ok'
                    : 'github-ci-orb__core'
                }
              >
                <span>
                  {workflow?.conclusion === 'success'
                    ? 'PASS'
                    : workflow
                      ? 'CHECK'
                      : '—'}
                </span>
              </div>
            </div>

            <div className="github-ci-caption">
              <strong>{workflow?.name ?? 'CI'}</strong>
              <span>
                {workflow
                  ? `${workflow.branch} / ${workflow.event}`
                  : 'NO REMOTE WORKFLOW'}
              </span>
            </div>
          </section>
        </aside>
      </div>

      <footer className="github-dashboard__footer">
        <span>
          REMOTE //
          {' '}
          {repo?.pushedAt
            ? `LAST PUSH ${shortDate(repo.pushedAt)}`
            : 'CONNECTING'}
        </span>

        <span>
          {error
            ? 'REMOTE DEGRADED / LOCAL DATA AVAILABLE'
            : 'GITHUB REST API / NATIVE RUST TRANSPORT'}
        </span>
      </footer>
    </main>
  )
}
