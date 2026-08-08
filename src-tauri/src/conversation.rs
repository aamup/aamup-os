use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::Manager;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationTurn {
    id: i64,
    session_id: String,
    role: String,
    content: String,
    intent: Option<String>,
    created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordConversationTurnRequest {
    session_id: String,
    role: String,
    content: String,
    intent: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSummary {
    id: i64,
    session_id: String,
    summary: String,
    turn_count: i64,
    created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveConversationSummaryRequest {
    session_id: String,
    summary: String,
    turn_count: i64,
}

fn conversation_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("unable to resolve app data directory: {error}"))?;

    fs::create_dir_all(&dir)
        .map_err(|error| format!("unable to create app data directory: {error}"))?;

    Ok(dir.join("conversation.db"))
}

fn open_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = conversation_db_path(app)?;
    let connection = Connection::open(path)
        .map_err(|error| format!("unable to open conversation database: {error}"))?;

    connection
        .execute_batch(
            "
            PRAGMA journal_mode = WAL;

            CREATE TABLE IF NOT EXISTS conversation_turns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                intent TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_conversation_turns_session
                ON conversation_turns(session_id, id DESC);

            CREATE INDEX IF NOT EXISTS idx_conversation_turns_created
                ON conversation_turns(created_at DESC);

            CREATE TABLE IF NOT EXISTS conversation_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                summary TEXT NOT NULL,
                turn_count INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, turn_count)
            );

            CREATE INDEX IF NOT EXISTS idx_conversation_summaries_created
                ON conversation_summaries(created_at DESC);
            ",
        )
        .map_err(|error| format!("unable to initialize conversation database: {error}"))?;

    Ok(connection)
}

fn validate_session_id(value: &str) -> Result<String, String> {
    let session_id = value.trim().to_string();

    if session_id.is_empty() {
        return Err("session id cannot be empty".to_string());
    }

    if session_id.len() > 128 {
        return Err("session id exceeds 128 characters".to_string());
    }

    Ok(session_id)
}

fn row_to_turn(row: &rusqlite::Row<'_>) -> rusqlite::Result<ConversationTurn> {
    Ok(ConversationTurn {
        id: row.get(0)?,
        session_id: row.get(1)?,
        role: row.get(2)?,
        content: row.get(3)?,
        intent: row.get(4)?,
        created_at: row.get(5)?,
    })
}

fn row_to_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<ConversationSummary> {
    Ok(ConversationSummary {
        id: row.get(0)?,
        session_id: row.get(1)?,
        summary: row.get(2)?,
        turn_count: row.get(3)?,
        created_at: row.get(4)?,
    })
}

#[tauri::command]
pub fn record_conversation_turn(
    app: tauri::AppHandle,
    request: RecordConversationTurnRequest,
) -> Result<ConversationTurn, String> {
    let session_id = validate_session_id(&request.session_id)?;
    let role = request.role.trim().to_lowercase();

    if role != "user" && role != "assistant" {
        return Err("conversation role must be user or assistant".to_string());
    }

    let content = request.content.trim().to_string();

    if content.is_empty() {
        return Err("conversation content cannot be empty".to_string());
    }

    if content.len() > 12_000 {
        return Err("conversation content exceeds 12000 characters".to_string());
    }

    let intent = request
        .intent
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty());

    if intent.as_ref().is_some_and(|value| value.len() > 64) {
        return Err("conversation intent exceeds 64 characters".to_string());
    }

    let connection = open_connection(&app)?;

    connection
        .execute(
            "
            INSERT INTO conversation_turns
                (session_id, role, content, intent)
            VALUES (?1, ?2, ?3, ?4)
            ",
            params![session_id, role, content, intent],
        )
        .map_err(|error| format!("unable to record conversation turn: {error}"))?;

    let id = connection.last_insert_rowid();

    connection
        .query_row(
            "
            SELECT id, session_id, role, content, intent, created_at
            FROM conversation_turns
            WHERE id = ?1
            ",
            params![id],
            row_to_turn,
        )
        .map_err(|error| format!("unable to read conversation turn: {error}"))
}

#[tauri::command]
pub fn list_conversation_turns(
    app: tauri::AppHandle,
    session_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<ConversationTurn>, String> {
    let connection = open_connection(&app)?;
    let limit = limit.unwrap_or(20).clamp(1, 100);

    if let Some(session_id) = session_id {
        let session_id = validate_session_id(&session_id)?;
        let mut statement = connection
            .prepare(
                "
                SELECT id, session_id, role, content, intent, created_at
                FROM conversation_turns
                WHERE session_id = ?1
                ORDER BY id DESC
                LIMIT ?2
                ",
            )
            .map_err(|error| format!("unable to prepare session history query: {error}"))?;

        let rows = statement
            .query_map(params![session_id, limit], row_to_turn)
            .map_err(|error| format!("unable to list session history: {error}"))?;

        return rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("unable to decode session history: {error}"));
    }

    let mut statement = connection
        .prepare(
            "
            SELECT id, session_id, role, content, intent, created_at
            FROM conversation_turns
            ORDER BY id DESC
            LIMIT ?1
            ",
        )
        .map_err(|error| format!("unable to prepare conversation history query: {error}"))?;

    let rows = statement
        .query_map(params![limit], row_to_turn)
        .map_err(|error| format!("unable to list conversation history: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("unable to decode conversation history: {error}"))
}

#[tauri::command]
pub fn save_conversation_summary(
    app: tauri::AppHandle,
    request: SaveConversationSummaryRequest,
) -> Result<ConversationSummary, String> {
    let session_id = validate_session_id(&request.session_id)?;
    let summary = request.summary.trim().to_string();

    if summary.is_empty() {
        return Err("conversation summary cannot be empty".to_string());
    }

    if summary.len() > 8_000 {
        return Err("conversation summary exceeds 8000 characters".to_string());
    }

    if request.turn_count <= 0 {
        return Err("summary turn count must be positive".to_string());
    }

    let connection = open_connection(&app)?;

    connection
        .execute(
            "
            INSERT INTO conversation_summaries
                (session_id, summary, turn_count)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(session_id, turn_count)
            DO UPDATE SET
                summary = excluded.summary,
                created_at = CURRENT_TIMESTAMP
            ",
            params![session_id, summary, request.turn_count],
        )
        .map_err(|error| format!("unable to save conversation summary: {error}"))?;

    connection
        .query_row(
            "
            SELECT id, session_id, summary, turn_count, created_at
            FROM conversation_summaries
            WHERE session_id = ?1 AND turn_count = ?2
            ",
            params![session_id, request.turn_count],
            row_to_summary,
        )
        .map_err(|error| format!("unable to read conversation summary: {error}"))
}

#[tauri::command]
pub fn list_conversation_summaries(
    app: tauri::AppHandle,
    limit: Option<u32>,
) -> Result<Vec<ConversationSummary>, String> {
    let connection = open_connection(&app)?;
    let limit = limit.unwrap_or(20).clamp(1, 100);

    let mut statement = connection
        .prepare(
            "
            SELECT id, session_id, summary, turn_count, created_at
            FROM conversation_summaries
            ORDER BY id DESC
            LIMIT ?1
            ",
        )
        .map_err(|error| format!("unable to prepare summary query: {error}"))?;

    let rows = statement
        .query_map(params![limit], row_to_summary)
        .map_err(|error| format!("unable to list conversation summaries: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("unable to decode conversation summaries: {error}"))
}
