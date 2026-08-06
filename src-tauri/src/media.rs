use std::process::Command;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSession {
    available: bool,
    player: String,
    status: String,
    artist: String,
    title: String,
    album: String,
    art_url: String,
    position_seconds: f64,
    duration_seconds: f64,
}

fn run_playerctl(args: &[&str]) -> Result<String, String> {
    let output = Command::new("playerctl")
        .args(args)
        .output()
        .map_err(|error| format!("unable to execute playerctl: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

        return Err(if stderr.is_empty() {
            "playerctl command failed".to_string()
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn empty_session() -> MediaSession {
    MediaSession {
        available: false,
        player: String::new(),
        status: "Stopped".to_string(),
        artist: String::new(),
        title: String::new(),
        album: String::new(),
        art_url: String::new(),
        position_seconds: 0.0,
        duration_seconds: 0.0,
    }
}

fn parse_duration_microseconds(value: &str) -> f64 {
    value.trim().parse::<f64>().unwrap_or(0.0) / 1_000_000.0
}

#[tauri::command]
pub fn get_media_session() -> Result<MediaSession, String> {
    let format = "{{playerName}}\u{001f}{{status}}\u{001f}{{artist}}\u{001f}{{title}}\u{001f}{{album}}\u{001f}{{mpris:artUrl}}\u{001f}{{mpris:length}}";

    let raw = match run_playerctl(&["-a", "metadata", "--format", format]) {
        Ok(value) if !value.trim().is_empty() => value,
        Ok(_) => return Ok(empty_session()),
        Err(error) => {
            if error.to_lowercase().contains("no players") {
                return Ok(empty_session());
            }

            return Err(error);
        }
    };

    let mut sessions = raw
        .lines()
        .filter_map(|line| {
            let parts = line.split('\u{001f}').collect::<Vec<_>>();

            if parts.len() < 7 {
                return None;
            }

            Some((
                parts[0].trim().to_string(),
                parts[1].trim().to_string(),
                parts[2].trim().to_string(),
                parts[3].trim().to_string(),
                parts[4].trim().to_string(),
                parts[5].trim().to_string(),
                parse_duration_microseconds(parts[6]),
            ))
        })
        .collect::<Vec<_>>();

    if sessions.is_empty() {
        return Ok(empty_session());
    }

    sessions.sort_by_key(|session| {
        if session.1.eq_ignore_ascii_case("playing") {
            0
        } else if session.1.eq_ignore_ascii_case("paused") {
            1
        } else {
            2
        }
    });

    let (player, status, artist, title, album, art_url, duration_seconds) = sessions.remove(0);

    let position_seconds = run_playerctl(&["-p", &player, "position"])
        .ok()
        .and_then(|value| value.parse::<f64>().ok())
        .unwrap_or(0.0);

    Ok(MediaSession {
        available: true,
        player,
        status,
        artist,
        title,
        album,
        art_url,
        position_seconds,
        duration_seconds,
    })
}

#[tauri::command]
pub fn media_control(player: String, action: String) -> Result<(), String> {
    let command = match action.as_str() {
        "play-pause" => "play-pause",
        "play" => "play",
        "pause" => "pause",
        "next" => "next",
        "previous" => "previous",
        _ => return Err(format!("unsupported media action: {action}")),
    };

    if player.trim().is_empty() {
        return Err("no active media player".to_string());
    }

    run_playerctl(&["-p", &player, command])?;
    Ok(())
}
