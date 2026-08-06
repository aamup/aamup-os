use reqwest::{
    header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT},
    Client,
};
use serde_json::Value;

const OWNER: &str = "aamup";
const REPO: &str = "aamup-os";
const API_ROOT: &str = "https://api.github.com";

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepositorySummary {
    full_name: String,
    description: String,
    html_url: String,
    default_branch: String,
    visibility: String,
    stars: u64,
    forks: u64,
    open_items: u64,
    pushed_at: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCommitSummary {
    sha: String,
    message: String,
    author: String,
    date: String,
    html_url: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubIssueSummary {
    number: u64,
    title: String,
    html_url: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubPullRequestSummary {
    number: u64,
    title: String,
    html_url: String,
    draft: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubWorkflowSummary {
    name: String,
    status: String,
    conclusion: String,
    branch: String,
    event: String,
    html_url: String,
    created_at: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRemoteState {
    repository: GitHubRepositorySummary,
    recent_commits: Vec<GitHubCommitSummary>,
    open_issues: Vec<GitHubIssueSummary>,
    open_pull_requests: Vec<GitHubPullRequestSummary>,
    latest_workflow: Option<GitHubWorkflowSummary>,
    rate_limit_remaining: Option<u64>,
}

fn string(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn number(value: &Value, key: &str) -> u64 {
    value.get(key).and_then(Value::as_u64).unwrap_or(0)
}

fn github_client() -> Result<Client, String> {
    let mut headers = HeaderMap::new();

    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("AAMUP-OS-GitHub-Intelligence"),
    );
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("application/vnd.github+json"),
    );
    headers.insert(
        "X-GitHub-Api-Version",
        HeaderValue::from_static("2022-11-28"),
    );

    let token = std::env::var("AAMUP_GITHUB_TOKEN")
        .ok()
        .or_else(|| std::env::var("GITHUB_TOKEN").ok());

    if let Some(token) = token {
        let value = HeaderValue::from_str(&format!("Bearer {token}"))
            .map_err(|_| "invalid GitHub token header".to_string())?;
        headers.insert(AUTHORIZATION, value);
    }

    Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|error| format!("unable to create GitHub HTTP client: {error}"))
}

async fn fetch_json(client: &Client, path: &str) -> Result<(Value, Option<u64>), String> {
    let url = format!("{API_ROOT}{path}");

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| format!("GitHub request failed: {error}"))?;

    let status = response.status();

    let rate_limit_remaining = response
        .headers()
        .get("x-ratelimit-remaining")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok());

    if !status.is_success() {
        let detail = response
            .text()
            .await
            .unwrap_or_else(|_| "no response body".to_string());

        return Err(format!(
            "GitHub API returned {status}: {}",
            detail.chars().take(240).collect::<String>()
        ));
    }

    let value = response
        .json::<Value>()
        .await
        .map_err(|error| format!("invalid GitHub response: {error}"))?;

    Ok((value, rate_limit_remaining))
}

fn parse_repository(value: &Value) -> GitHubRepositorySummary {
    GitHubRepositorySummary {
        full_name: string(value, "full_name"),
        description: string(value, "description"),
        html_url: string(value, "html_url"),
        default_branch: string(value, "default_branch"),
        visibility: string(value, "visibility"),
        stars: number(value, "stargazers_count"),
        forks: number(value, "forks_count"),
        open_items: number(value, "open_issues_count"),
        pushed_at: string(value, "pushed_at"),
    }
}

fn parse_commits(value: &Value) -> Vec<GitHubCommitSummary> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .map(|item| {
            let commit = item.get("commit").unwrap_or(&Value::Null);
            let author = commit.get("author").unwrap_or(&Value::Null);

            let message = string(commit, "message")
                .lines()
                .next()
                .unwrap_or_default()
                .to_string();

            GitHubCommitSummary {
                sha: string(item, "sha").chars().take(7).collect(),
                message,
                author: string(author, "name"),
                date: string(author, "date"),
                html_url: string(item, "html_url"),
            }
        })
        .collect()
}

fn parse_issues(value: &Value) -> Vec<GitHubIssueSummary> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter(|item| item.get("pull_request").is_none())
        .map(|item| GitHubIssueSummary {
            number: number(item, "number"),
            title: string(item, "title"),
            html_url: string(item, "html_url"),
        })
        .collect()
}

fn parse_pull_requests(value: &Value) -> Vec<GitHubPullRequestSummary> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .map(|item| GitHubPullRequestSummary {
            number: number(item, "number"),
            title: string(item, "title"),
            html_url: string(item, "html_url"),
            draft: item.get("draft").and_then(Value::as_bool).unwrap_or(false),
        })
        .collect()
}

fn parse_latest_workflow(value: &Value) -> Option<GitHubWorkflowSummary> {
    let item = value
        .get("workflow_runs")
        .and_then(Value::as_array)
        .and_then(|runs| runs.first())?;

    Some(GitHubWorkflowSummary {
        name: string(item, "name"),
        status: string(item, "status"),
        conclusion: string(item, "conclusion"),
        branch: string(item, "head_branch"),
        event: string(item, "event"),
        html_url: string(item, "html_url"),
        created_at: string(item, "created_at"),
    })
}

#[tauri::command]
pub async fn get_github_remote_state() -> Result<GitHubRemoteState, String> {
    let client = github_client()?;

    let (repository_json, rate_limit_remaining) =
        fetch_json(&client, &format!("/repos/{OWNER}/{REPO}")).await?;

    let (commits_json, _) = fetch_json(
        &client,
        &format!("/repos/{OWNER}/{REPO}/commits?per_page=5"),
    )
    .await?;

    let (issues_json, _) = fetch_json(
        &client,
        &format!("/repos/{OWNER}/{REPO}/issues?state=open&per_page=10"),
    )
    .await?;

    let (pulls_json, _) = fetch_json(
        &client,
        &format!("/repos/{OWNER}/{REPO}/pulls?state=open&per_page=5"),
    )
    .await?;

    let latest_workflow = match fetch_json(
        &client,
        &format!("/repos/{OWNER}/{REPO}/actions/runs?per_page=1"),
    )
    .await
    {
        Ok((workflow_json, _)) => parse_latest_workflow(&workflow_json),
        Err(_) => None,
    };

    Ok(GitHubRemoteState {
        repository: parse_repository(&repository_json),
        recent_commits: parse_commits(&commits_json),
        open_issues: parse_issues(&issues_json),
        open_pull_requests: parse_pull_requests(&pulls_json),
        latest_workflow,
        rate_limit_remaining,
    })
}
