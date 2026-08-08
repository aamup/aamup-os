mod assistant_embedding;
mod assistant_model;
mod conversation;
mod github_remote;
mod markets;
mod media;
mod memory;
mod memory_candidates;
mod news;
mod weather;

use assistant_embedding::{embed_texts, get_embedding_status};
use assistant_model::{get_assistant_model_status, query_assistant_model};
use conversation::{
    list_conversation_summaries, list_conversation_turns, record_conversation_turn,
    save_conversation_summary,
};
use github_remote::get_github_remote_state;
use markets::get_markets_intelligence;
use media::{get_media_session, media_control};
use memory::{forget_memory, list_memories, remember_memory, search_memories};
use memory_candidates::{
    create_memory_candidate, list_memory_candidates, review_memory_candidate,
};
use news::get_news_intelligence;
use std::{
    path::Path,
    process::Command,
    sync::{Mutex, OnceLock},
};
use sysinfo::{Disks, System};
use weather::get_weather_intelligence;

static SYSTEM: OnceLock<Mutex<System>> = OnceLock::new();

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemTelemetry {
    cpu: f32,
    memory: f64,
    disk: f64,
    process_count: usize,
    uptime_seconds: u64,
    hostname: String,
    os_name: String,
}

#[tauri::command]
fn get_system_telemetry() -> Result<SystemTelemetry, String> {
    let system = SYSTEM.get_or_init(|| Mutex::new(System::new_all()));

    let mut system = system
        .lock()
        .map_err(|_| "system telemetry lock poisoned".to_string())?;

    system.refresh_all();

    let cpu = system.global_cpu_usage();
    let total_memory = system.total_memory();
    let used_memory = system.used_memory();

    let memory = if total_memory > 0 {
        (used_memory as f64 / total_memory as f64) * 100.0
    } else {
        0.0
    };

    let disks = Disks::new_with_refreshed_list();
    let root_disk = disks
        .iter()
        .find(|disk| disk.mount_point() == Path::new("/"));

    let (total_disk, available_disk) = match root_disk {
        Some(disk) => (disk.total_space(), disk.available_space()),
        None => disks
            .iter()
            .fold((0_u64, 0_u64), |(total, available), disk| {
                (
                    total + disk.total_space(),
                    available + disk.available_space(),
                )
            }),
    };

    let disk = if total_disk > 0 {
        ((total_disk - available_disk) as f64 / total_disk as f64) * 100.0
    } else {
        0.0
    };

    let hostname = System::host_name().unwrap_or_else(|| "UNKNOWN".to_string());
    let os_name = System::long_os_version()
        .or_else(System::name)
        .unwrap_or_else(|| "Unknown OS".to_string());

    Ok(SystemTelemetry {
        cpu,
        memory,
        disk,
        process_count: system.processes().len(),
        uptime_seconds: System::uptime(),
        hostname,
        os_name,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GitRepositoryState {
    branch: String,
    head_short: String,
    head_message: String,
    commit_count: u64,
    changed_files: usize,
    ahead: u64,
    behind: u64,
    remote: Option<String>,
    clean: bool,
}

fn git_repository_dir() -> Result<std::path::PathBuf, String> {
    if let Ok(explicit) = std::env::var("AAMUP_REPO_PATH") {
        let path = std::path::PathBuf::from(explicit);
        if path.join(".git").exists() {
            return Ok(path);
        }
    }

    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));

    manifest
        .parent()
        .map(std::path::Path::to_path_buf)
        .ok_or_else(|| "unable to resolve AAMUP repository path".to_string())
}

fn run_git(repo: &std::path::Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(args)
        .output()
        .map_err(|error| format!("unable to execute git: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

        return Err(if stderr.is_empty() {
            format!("git command failed: git {}", args.join(" "))
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
fn get_git_repository_state() -> Result<GitRepositoryState, String> {
    let repo = git_repository_dir()?;

    let branch = run_git(&repo, &["branch", "--show-current"])?;
    let head_short = run_git(&repo, &["rev-parse", "--short", "HEAD"])?;
    let head_message = run_git(&repo, &["log", "-1", "--pretty=%s"])?;

    let commit_count = run_git(&repo, &["rev-list", "--count", "HEAD"])?
        .parse::<u64>()
        .unwrap_or(0);

    let status = run_git(&repo, &["status", "--porcelain"])?;
    let changed_files = status
        .lines()
        .filter(|line| !line.trim().is_empty())
        .count();

    let remote = run_git(&repo, &["remote", "get-url", "origin"]).ok();

    let (ahead, behind) = match run_git(
        &repo,
        &["rev-list", "--left-right", "--count", "@{upstream}...HEAD"],
    ) {
        Ok(counts) => {
            let mut parts = counts.split_whitespace();
            let behind = parts
                .next()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(0);
            let ahead = parts
                .next()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(0);

            (ahead, behind)
        }
        Err(_) => (0, 0),
    };

    Ok(GitRepositoryState {
        branch,
        head_short,
        head_message,
        commit_count,
        changed_files,
        ahead,
        behind,
        remote,
        clean: changed_files == 0,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_telemetry,
            get_git_repository_state,
            get_github_remote_state,
            get_weather_intelligence,
            get_markets_intelligence,
            get_news_intelligence,
            get_media_session,
            media_control,
            get_assistant_model_status,
            query_assistant_model,
            get_embedding_status,
            embed_texts,
            record_conversation_turn,
            list_conversation_turns,
            save_conversation_summary,
            list_conversation_summaries,
            remember_memory,
            list_memories,
            search_memories,
            forget_memory,
            create_memory_candidate,
            list_memory_candidates,
            review_memory_candidate
        ])
        .run(tauri::generate_context!())
        .expect("error while running AAMUP OS");
}
