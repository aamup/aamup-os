use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::Manager;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryCandidate {
    id: i64,
    content: String,
    category: String,
    confidence: f64,
    source_session_id: String,
    status: String,
    created_at: String,
    reviewed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMemoryCandidateRequest {
    content: String,
    category: String,
    confidence: f64,
    source_session_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryReviewResult {
    candidate: MemoryCandidate,
    memory_id: Option<i64>,
    promoted: bool,
}

fn memory_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("unable to resolve app data directory: {error}"))?;

    fs::create_dir_all(&dir)
        .map_err(|error| format!("unable to create app data directory: {error}"))?;

    Ok(dir.join("memory.db"))
}

fn open_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = memory_db_path(app)?;
    let connection = Connection::open(path)
        .map_err(|error| format!("unable to open memory database: {error}"))?;

    connection
        .execute_batch(
            "
            PRAGMA journal_mode = WAL;

            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_memories_created_at
                ON memories(created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_memories_category
                ON memories(category);

            CREATE TABLE IF NOT EXISTS memory_candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                content_key TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                confidence REAL NOT NULL,
                source_session_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_memory_candidates_status
                ON memory_candidates(status, id DESC);

            CREATE INDEX IF NOT EXISTS idx_memory_candidates_session
                ON memory_candidates(source_session_id, id DESC);
            ",
        )
        .map_err(|error| format!("unable to initialize memory candidate store: {error}"))?;

    Ok(connection)
}

fn normalize_content_key(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn validate_category(value: &str) -> Result<String, String> {
    let category = value.trim().to_lowercase();

    let allowed = [
        "preference",
        "project",
        "goal",
        "constraint",
        "decision",
        "identity",
        "general",
    ];

    if allowed.contains(&category.as_str()) {
        Ok(category)
    } else {
        Err(format!("unsupported memory candidate category: {category}"))
    }
}

fn row_to_candidate(row: &rusqlite::Row<'_>) -> rusqlite::Result<MemoryCandidate> {
    Ok(MemoryCandidate {
        id: row.get(0)?,
        content: row.get(1)?,
        category: row.get(2)?,
        confidence: row.get(3)?,
        source_session_id: row.get(4)?,
        status: row.get(5)?,
        created_at: row.get(6)?,
        reviewed_at: row.get(7)?,
    })
}

fn get_candidate(
    connection: &Connection,
    id: i64,
) -> Result<MemoryCandidate, String> {
    connection
        .query_row(
            "
            SELECT
                id,
                content,
                category,
                confidence,
                source_session_id,
                status,
                created_at,
                reviewed_at
            FROM memory_candidates
            WHERE id = ?1
            ",
            params![id],
            row_to_candidate,
        )
        .map_err(|error| format!("unable to read memory candidate: {error}"))
}

#[tauri::command]
pub fn create_memory_candidate(
    app: tauri::AppHandle,
    request: CreateMemoryCandidateRequest,
) -> Result<Option<MemoryCandidate>, String> {
    let content = request.content.trim().to_string();

    if content.len() < 8 {
        return Err("memory candidate is too short".to_string());
    }

    if content.len() > 1_000 {
        return Err("memory candidate exceeds 1000 characters".to_string());
    }

    if !(0.0..=1.0).contains(&request.confidence) {
        return Err("memory candidate confidence must be between 0 and 1".to_string());
    }

    let category = validate_category(&request.category)?;
    let session_id = request.source_session_id.trim().to_string();

    if session_id.is_empty() || session_id.len() > 128 {
        return Err("invalid memory candidate session id".to_string());
    }

    let content_key = normalize_content_key(&content);
    let connection = open_connection(&app)?;

    let existing_memory: Option<i64> = connection
        .query_row(
            "
            SELECT id
            FROM memories
            WHERE lower(trim(content)) = ?1
            LIMIT 1
            ",
            params![content_key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("unable to check existing memory: {error}"))?;

    if existing_memory.is_some() {
        return Ok(None);
    }

    let changed = connection
        .execute(
            "
            INSERT OR IGNORE INTO memory_candidates
                (
                    content,
                    content_key,
                    category,
                    confidence,
                    source_session_id
                )
            VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![
                content,
                content_key,
                category,
                request.confidence,
                session_id
            ],
        )
        .map_err(|error| format!("unable to create memory candidate: {error}"))?;

    if changed == 0 {
        return Ok(None);
    }

    let id = connection.last_insert_rowid();
    get_candidate(&connection, id).map(Some)
}

#[tauri::command]
pub fn list_memory_candidates(
    app: tauri::AppHandle,
    status: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<MemoryCandidate>, String> {
    let connection = open_connection(&app)?;
    let limit = limit.unwrap_or(50).clamp(1, 100);
    let status = status
        .unwrap_or_else(|| "pending".to_string())
        .trim()
        .to_lowercase();

    if !["pending", "approved", "rejected", "all"].contains(&status.as_str()) {
        return Err("candidate status must be pending, approved, rejected, or all".to_string());
    }

    if status == "all" {
        let mut statement = connection
            .prepare(
                "
                SELECT
                    id,
                    content,
                    category,
                    confidence,
                    source_session_id,
                    status,
                    created_at,
                    reviewed_at
                FROM memory_candidates
                ORDER BY id DESC
                LIMIT ?1
                ",
            )
            .map_err(|error| format!("unable to prepare candidate query: {error}"))?;

        let rows = statement
            .query_map(params![limit], row_to_candidate)
            .map_err(|error| format!("unable to list memory candidates: {error}"))?;

        return rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("unable to decode memory candidates: {error}"));
    }

    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                content,
                category,
                confidence,
                source_session_id,
                status,
                created_at,
                reviewed_at
            FROM memory_candidates
            WHERE status = ?1
            ORDER BY id DESC
            LIMIT ?2
            ",
        )
        .map_err(|error| format!("unable to prepare candidate query: {error}"))?;

    let rows = statement
        .query_map(params![status, limit], row_to_candidate)
        .map_err(|error| format!("unable to list memory candidates: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("unable to decode memory candidates: {error}"))
}

#[tauri::command]
pub fn review_memory_candidate(
    app: tauri::AppHandle,
    id: i64,
    decision: String,
) -> Result<MemoryReviewResult, String> {
    if id <= 0 {
        return Err("memory candidate id must be positive".to_string());
    }

    let decision = decision.trim().to_lowercase();

    if decision != "approve" && decision != "reject" {
        return Err("candidate decision must be approve or reject".to_string());
    }

    let mut connection = open_connection(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("unable to start memory review transaction: {error}"))?;

    let candidate = transaction
        .query_row(
            "
            SELECT
                id,
                content,
                category,
                confidence,
                source_session_id,
                status,
                created_at,
                reviewed_at
            FROM memory_candidates
            WHERE id = ?1
            ",
            params![id],
            row_to_candidate,
        )
        .map_err(|error| format!("unable to read memory candidate: {error}"))?;

    if candidate.status != "pending" {
        return Err(format!(
            "memory candidate #{id} has already been {}",
            candidate.status
        ));
    }

    let mut memory_id = None;
    let promoted;

    if decision == "approve" {
        let content_key = normalize_content_key(&candidate.content);

        memory_id = transaction
            .query_row(
                "
                SELECT id
                FROM memories
                WHERE lower(trim(content)) = ?1
                LIMIT 1
                ",
                params![content_key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| format!("unable to check permanent memory: {error}"))?;

        if memory_id.is_none() {
            transaction
                .execute(
                    "
                    INSERT INTO memories (content, category)
                    VALUES (?1, ?2)
                    ",
                    params![candidate.content, candidate.category],
                )
                .map_err(|error| format!("unable to promote memory candidate: {error}"))?;

            memory_id = Some(transaction.last_insert_rowid());
        }

        transaction
            .execute(
                "
                UPDATE memory_candidates
                SET status = 'approved',
                    reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ?1
                ",
                params![id],
            )
            .map_err(|error| format!("unable to mark candidate approved: {error}"))?;

        promoted = true;
    } else {
        transaction
            .execute(
                "
                UPDATE memory_candidates
                SET status = 'rejected',
                    reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ?1
                ",
                params![id],
            )
            .map_err(|error| format!("unable to mark candidate rejected: {error}"))?;

        promoted = false;
    }

    transaction
        .commit()
        .map_err(|error| format!("unable to commit memory review: {error}"))?;

    let candidate = get_candidate(&connection, id)?;

    Ok(MemoryReviewResult {
        candidate,
        memory_id,
        promoted,
    })
}
