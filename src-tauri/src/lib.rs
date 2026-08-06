use std::{
    path::Path,
    sync::{Mutex, OnceLock},
};

use sysinfo::{Disks, System};

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
        Some(disk) => (
            disk.total_space(),
            disk.available_space(),
        ),
        None => disks.iter().fold(
            (0_u64, 0_u64),
            |(total, available), disk| {
                (
                    total + disk.total_space(),
                    available + disk.available_space(),
                )
            },
        ),
    };

    let disk = if total_disk > 0 {
        ((total_disk - available_disk) as f64 / total_disk as f64) * 100.0
    } else {
        0.0
    };

    let hostname =
        System::host_name().unwrap_or_else(|| "UNKNOWN".to_string());

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(
            tauri::generate_handler![
                get_system_telemetry
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running AAMUP OS");
}
