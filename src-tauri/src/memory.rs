use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::Manager;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEntry {
    id: i64,
    content: String,
    category: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RememberMemoryRequest {
    content: String,
    category: Option<String>,
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
            ",
        )
        .map_err(|error| format!("unable to initialize memory database: {error}"))?;

    Ok(connection)
}

fn row_to_memory(row: &rusqlite::Row<'_>) -> rusqlite::Result<MemoryEntry> {
    Ok(MemoryEntry {
        id: row.get(0)?,
        content: row.get(1)?,
        category: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

#[tauri::command]
pub fn remember_memory(
    app: tauri::AppHandle,
    request: RememberMemoryRequest,
) -> Result<MemoryEntry, String> {
    let content = request.content.trim().to_string();

    if content.is_empty() {
        return Err("memory content cannot be empty".to_string());
    }

    if content.len() > 8_000 {
        return Err("memory content exceeds 8000 characters".to_string());
    }

    let category = request
        .category
        .unwrap_or_else(|| "general".to_string())
        .trim()
        .to_lowercase();

    let category = if category.is_empty() {
        "general".to_string()
    } else {
        category
    };

    let connection = open_connection(&app)?;

    connection
        .execute(
            "INSERT INTO memories (content, category) VALUES (?1, ?2)",
            params![content, category],
        )
        .map_err(|error| format!("unable to save memory: {error}"))?;

    let id = connection.last_insert_rowid();

    connection
        .query_row(
            "
            SELECT id, content, category, created_at, updated_at
            FROM memories
            WHERE id = ?1
            ",
            params![id],
            row_to_memory,
        )
        .map_err(|error| format!("unable to read saved memory: {error}"))
}

#[tauri::command]
pub fn list_memories(
    app: tauri::AppHandle,
    limit: Option<u32>,
) -> Result<Vec<MemoryEntry>, String> {
    let connection = open_connection(&app)?;
    let limit = limit.unwrap_or(50).clamp(1, 100);

    let mut statement = connection
        .prepare(
            "
            SELECT id, content, category, created_at, updated_at
            FROM memories
            ORDER BY id DESC
            LIMIT ?1
            ",
        )
        .map_err(|error| format!("unable to prepare memory query: {error}"))?;

    let rows = statement
        .query_map(params![limit], row_to_memory)
        .map_err(|error| format!("unable to list memories: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("unable to decode memories: {error}"))
}

#[tauri::command]
pub fn search_memories(
    app: tauri::AppHandle,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<MemoryEntry>, String> {
    let query = query.trim().to_string();

    if query.is_empty() {
        return list_memories(app, limit);
    }

    let connection = open_connection(&app)?;
    let limit = limit.unwrap_or(50).clamp(1, 100);
    let pattern = format!("%{query}%");

    let mut statement = connection
        .prepare(
            "
            SELECT id, content, category, created_at, updated_at
            FROM memories
            WHERE content LIKE ?1 COLLATE NOCASE
               OR category LIKE ?1 COLLATE NOCASE
            ORDER BY id DESC
            LIMIT ?2
            ",
        )
        .map_err(|error| format!("unable to prepare memory search: {error}"))?;

    let rows = statement
        .query_map(params![pattern, limit], row_to_memory)
        .map_err(|error| format!("unable to search memories: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("unable to decode memory search: {error}"))
}

#[tauri::command]
pub fn forget_memory(app: tauri::AppHandle, id: i64) -> Result<bool, String> {
    if id <= 0 {
        return Err("memory id must be positive".to_string());
    }

    let connection = open_connection(&app)?;

    let changed = connection
        .execute("DELETE FROM memories WHERE id = ?1", params![id])
        .map_err(|error| format!("unable to delete memory: {error}"))?;

    Ok(changed > 0)
}
