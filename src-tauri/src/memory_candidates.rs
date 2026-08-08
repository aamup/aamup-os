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


fn contains_any(value: &str, terms: &[&str]) -> bool {
    terms.iter().any(|term| value.contains(term))
}

fn normalized_candidate_text(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn contains_sensitive_material(value: &str) -> bool {
    contains_any(
        value,
        &[
            "password is",
            "password:",
            "passcode is",
            "passcode:",
            "api key is",
            "api key:",
            "api_key=",
            "access token is",
            "access token:",
            "refresh token is",
            "refresh token:",
            "private key",
            "bearer ",
            "ssn",
            "social security number",
            "credit card number",
            "bank account number",
            "routing number",
            "diagnosed with",
            "medical diagnosis",
            "case number",
            "court case number",
        ],
    )
}

fn is_transient_activity(value: &str) -> bool {
    contains_any(
        value,
        &[
            "user asked",
            "user requested",
            "user queried",
            "user checked",
            "user searched",
            "user looked up",
            "user wanted to know",
            "user viewed",
            "user opened",
            "user ran",
            "user executed",
            "user received",
            "user was shown",
            "user requested information",
        ],
    )
}

fn has_durable_marker(value: &str) -> bool {
    contains_any(
        value,
        &[
            "prefers",
            "preference",
            "always",
            "goal",
            "plans to",
            "aims to",
            "wants to",
            "must",
            "cannot",
            "should not",
            "avoid",
            "requires",
            "requirement",
            "constraint",
            "decided",
            "decision",
            "chose",
            "chosen",
            "will use",
            "uses ",
            "visual identity",
            "architecture",
            "works as",
            "is a ",
            "is an ",
            "local-first",
            "default to",
            "standardize",
        ],
    )
}

fn passes_category_semantics(category: &str, value: &str) -> bool {
    match category {
        "preference" => contains_any(
            value,
            &["prefers", "preference", "likes", "always", "default to", "wants aamup", "wants the"],
        ),
        "goal" => contains_any(value, &["goal", "plans to", "aims to", "wants to", "working toward"]),
        "constraint" => contains_any(
            value,
            &["must", "cannot", "should not", "avoid", "requires", "requirement", "constraint", "only"],
        ),
        "decision" => contains_any(
            value,
            &["decided", "decision", "chose", "chosen", "will use", "uses ", "should ", "standardize", "architecture", "visual identity"],
        ),
        "identity" => value.starts_with("user is ") || value.starts_with("user works ") || value.contains("works as"),
        "project" => {
            (value.starts_with("aamup") || value.starts_with("the project") || value.contains("aamup os"))
                && has_durable_marker(value)
        }
        "general" => has_durable_marker(value),
        _ => false,
    }
}

fn is_durable_candidate(category: &str, content: &str) -> bool {
    let value = normalized_candidate_text(content);

    !contains_sensitive_material(&value)
        && !is_transient_activity(&value)
        && passes_category_semantics(category, &value)
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


    if !is_durable_candidate(&category, &content) {
        return Ok(None);
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

#[cfg(test)]
mod tests {
    use super::is_durable_candidate;

    #[test]
    fn rejects_transient_activity() {
        let cases = [
            ("decision", "User asked for weather forecast for Portland Metro area"),
            ("preference", "User requested information about weather conditions over multiple days"),
            ("general", "User checked the latest AI news"),
            ("general", "User searched current NVDA price"),
            ("project", "User opened GitHub repository status"),
            ("general", "User ran the history command"),
            ("general", "User queried the current weather"),
            ("preference", "User asked to see Bitcoin prices"),
            ("decision", "User requested a daily briefing"),
            ("project", "User checked system telemetry"),
        ];

        for (category, content) in cases {
            assert!(!is_durable_candidate(category, content), "transient activity should be rejected: {content}");
        }
    }

    #[test]
    fn accepts_durable_memory() {
        let cases = [
            ("preference", "User prefers local-first features whenever possible"),
            ("constraint", "AAMUP OS should avoid cloud dependencies unless necessary"),
            ("goal", "User's goal is to make AAMUP OS a native personal intelligence desktop app"),
            ("decision", "AAMUP OS uses black, white, and restrained red as its visual identity"),
            ("identity", "User works as a substance use disorder counselor"),
            ("preference", "User wants AAMUP OS to always use compact typography"),
            ("project", "AAMUP OS uses a local-first architecture"),
            ("general", "User is a software developer"),
            ("constraint", "AAMUP OS must not store passwords"),
            ("decision", "AAMUP OS will use SQLite for persistent local memory"),
            ("goal", "User plans to add voice control after v1.0"),
            ("preference", "User likes concise terminal output"),
        ];

        for (category, content) in cases {
            assert!(is_durable_candidate(category, content), "durable memory should be accepted: {content}");
        }
    }

    #[test]
    fn rejects_sensitive_material() {
        let cases = [
            ("identity", "User is diagnosed with bipolar disorder"),
            ("general", "User's API key is abc123"),
            ("general", "User's password: hunter2"),
            ("general", "User's bank account number is 123456"),
            ("identity", "User's court case number is 22CR1234"),
        ];

        for (category, content) in cases {
            assert!(!is_durable_candidate(category, content), "sensitive material should be rejected: {content}");
        }
    }

    #[test]
    fn rejects_content_without_durable_semantics() {
        let cases = [
            ("general", "No durable facts were discussed"),
            ("preference", "Weather information was requested multiple times"),
            ("project", "The weather was cloudy today"),
        ];

        for (category, content) in cases {
            assert!(!is_durable_candidate(category, content), "non-durable content should be rejected: {content}");
        }
    }
}

