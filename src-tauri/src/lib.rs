// digibuddy — read-only bridge to the tuipet save.
// tuipet writes save.json atomically (tmp + os.replace), so a poll-read can
// never observe a half-written file. We NEVER write: tuipet owns the save.
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use serde::Serialize;
use tauri::Emitter;
use tauri_plugin_sql::{Migration, MigrationKind};
#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Mirrors tuipet's persistio._pick_save_dir() (first candidate wins, minus
/// the iOS-only writable-home probe, which cannot apply on Windows).
fn save_dir() -> PathBuf {
    if let Ok(env) = std::env::var("TUIPET_SAVE_DIR") {
        if !env.is_empty() {
            return PathBuf::from(env);
        }
    }
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        if !xdg.is_empty() {
            return PathBuf::from(xdg).join("tuipet");
        }
    }
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();
    PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("tuipet")
}

fn save_file() -> PathBuf {
    save_dir().join("save.json")
}

/// Absolute path of save.json (frontend shows it in the menu/status).
#[tauri::command]
fn save_path() -> String {
    save_file().to_string_lossy().into_owned()
}

/// Contents of save.json, or None when tuipet has no pet yet.
#[tauri::command]
fn read_save() -> Option<String> {
    fs::read_to_string(save_file()).ok()
}

/// Forward a chat payload to local Ollama (avoids webview CORS entirely).
/// `payload` is the JSON body for POST /api/chat ({model, messages, options}).
#[tauri::command]
async fn ollama_chat(payload: String) -> Result<String, String> {
    let body: serde_json::Value = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let resp = ureq::post("http://127.0.0.1:11434/api/chat")
            .set("Content-Type", "application/json")
            .timeout(Duration::from_secs(60))
            .send_json(body)
            .map_err(|e| format!("ollama no responde ({e}). ¿Está arrancado?"))?;
        let v: serde_json::Value = resp.into_json().map_err(|e| e.to_string())?;
        v["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "respuesta vacía de ollama".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

// --- tuipet process control --------------------------------------------------
// tuipet is a Textual TUI, so it needs a real console: we spawn `cmd` with
// CREATE_NEW_CONSOLE. On Windows 11 that routes through the user's default
// terminal (Windows Terminal here), so there's no wt.exe dependency to break.

#[cfg(windows)]
mod win {
    #[link(name = "kernel32")]
    extern "system" {
        pub fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
        pub fn GetExitCodeProcess(handle: isize, code: *mut u32) -> i32;
        pub fn CloseHandle(handle: isize) -> i32;
    }
    #[link(name = "user32")]
    extern "system" {
        pub fn MessageBeep(kind: u32) -> i32;
    }
}

/// The source checkout: ~/Documents/tuipet (the clone), preferred over the pip
/// install so the pet always runs the code you just pulled.
fn tuipet_repo() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();
    PathBuf::from(home).join("Documents").join("tuipet")
}

/// Is this pid still running? (OpenProcess + GetExitCodeProcess == STILL_ACTIVE)
fn pid_alive(pid: u32) -> bool {
    #[cfg(windows)]
    unsafe {
        const QUERY_LIMITED: u32 = 0x1000;
        const STILL_ACTIVE: u32 = 259;
        let h = win::OpenProcess(QUERY_LIMITED, 0, pid);
        if h == 0 {
            return false;
        }
        let mut code = 0u32;
        let ok = win::GetExitCodeProcess(h, &mut code) != 0;
        win::CloseHandle(h);
        ok && code == STILL_ACTIVE
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
        false
    }
}

/// tuipet claims the save dir with a `running.pid` file (persistio._LOCK_NAME);
/// a stale pid (hard kill) reads as "not running" — same rule the game uses.
fn live_tuipet_pid() -> Option<u32> {
    let raw = fs::read_to_string(save_dir().join("running.pid")).ok()?;
    let pid = raw.trim().parse::<u32>().ok()?;
    pid_alive(pid).then_some(pid)
}

/// Mirrors appboot._load_sound(): "off" is silent, a missing file means on.
fn sound_on() -> bool {
    fs::read_to_string(save_dir().join("sound.txt"))
        .map(|s| s.trim() != "off")
        .unwrap_or(true)
}

#[derive(Serialize)]
pub struct TuipetStatus {
    pid: Option<u32>,
    sound: bool,
}

/// Is the game running, and is its own sound preference on?
#[tauri::command]
fn tuipet_status() -> TuipetStatus {
    TuipetStatus {
        pid: live_tuipet_pid(),
        sound: sound_on(),
    }
}

/// Open tuipet in a console window. Never starts a second copy — the game
/// locks the save dir and two instances would fight over one save.
#[tauri::command]
fn launch_tuipet() -> Result<String, String> {
    if let Some(pid) = live_tuipet_pid() {
        return Ok(format!(
            "tuipet ya está corriendo (pid {pid}). Cambia a esa ventana."
        ));
    }
    // The clone is a src/ layout, so run it the way its own README does:
    // cwd = <repo>/src and `-m tuipet.app` (not `-m tuipet` — that module
    // only exists after install). Falls back to the pip console script.
    let repo = tuipet_repo();
    let src = repo.join("src");
    let from_clone = src.join("tuipet").join("app.py").is_file();
    let mut cmd = Command::new("cmd");
    cmd.arg("/k");
    // chcp 65001 + PYTHONUTF8: the game draws halfblock Unicode art and
    // _preflight prints a "⚠" warning; on a cp1252/936 console that raises
    // UnicodeEncodeError and kills the launch (seen in testing).
    cmd.arg(if from_clone {
        "chcp 65001 >nul && python -m tuipet.app"
    } else {
        "chcp 65001 >nul && tuipet"
    });
    if from_clone {
        let _ = cmd.current_dir(&src);
    }
    cmd.env("PYTHONUTF8", "1");
    #[cfg(windows)]
    cmd.creation_flags(0x0000_0010); // CREATE_NEW_CONSOLE
    match cmd.spawn() {
        // Child is dropped on purpose: the console outlives digibuddy.
        Ok(_) => Ok(if from_clone {
            format!("Abriendo tuipet desde el clon ({}).", repo.display())
        } else {
            "Abriendo tuipet (versión instalada; no hay clon en Documents).".into()
        }),
        Err(e) => Err(format!("No pude abrir tuipet: {e}")),
    }
}

// --- digibuddy's own memory (SQLite) ----------------------------------------
// This is digibuddy's own store: it never touches save.json, which tuipet owns.

/// Connection string the frontend passes to `load()`. The plugin resolves a
/// relative `sqlite:` path against Tauri's app_config_dir (and creates that
/// dir itself), so this stays a bare filename. It is also the key the
/// migration registry is registered under — the frontend must load exactly
/// this string or the schema would never be created.
#[tauri::command]
fn db_url() -> String {
    "sqlite:digibuddy.sqlite3".to_string()
}

/// Chat transcript, save-event log and reminders.
/// One statement per migration: sqlx's Migrator records each version in its own
/// transaction, and splitting keeps every entry trivially verifiable.
fn sql_migrations() -> Vec<Migration> {
    [
        (
            "tabla de mensajes del chat",
            "CREATE TABLE IF NOT EXISTS messages (\
               id INTEGER PRIMARY KEY AUTOINCREMENT,\
               role TEXT NOT NULL,\
               content TEXT NOT NULL,\
               created_at INTEGER NOT NULL\
             )",
        ),
        (
            "indice de mensajes por fecha",
            "CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)",
        ),
        (
            "tabla de eventos de la mascota",
            "CREATE TABLE IF NOT EXISTS events (\
               id INTEGER PRIMARY KEY AUTOINCREMENT,\
               kind TEXT NOT NULL,\
               detail TEXT NOT NULL DEFAULT '',\
               created_at INTEGER NOT NULL\
             )",
        ),
        (
            "indice de eventos por fecha",
            "CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)",
        ),
        (
            "tabla de recordatorios",
            "CREATE TABLE IF NOT EXISTS reminders (\
               id INTEGER PRIMARY KEY AUTOINCREMENT,\
               text TEXT NOT NULL,\
               due_at INTEGER NOT NULL,\
               done INTEGER NOT NULL DEFAULT 0,\
               created_at INTEGER NOT NULL\
             )",
        ),
        (
            "indice de recordatorios pendientes",
            "CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(done, due_at)",
        ),
    ]
    .iter()
    .enumerate()
    .map(|(i, (description, sql))| Migration {
        version: (i + 1) as i64,
        description,
        sql,
        kind: MigrationKind::Up,
    })
    .collect()
}

/// System beep, classed by need urgency — same 1/2/3 scale as the game's
/// own _alarm_urgency (1 routine / 2 mess / 3 urgent). Silent when the game's
/// own sound.txt says "off".
#[tauri::command]
fn beep(urgency: u8) -> bool {
    if !sound_on() {
        return false;
    }
    #[cfg(windows)]
    unsafe {
        const ASTERISK: u32 = 0x0040;
        const EXCLAMATION: u32 = 0x0030;
        const HAND: u32 = 0x0010;
        win::MessageBeep(match urgency {
            3 => HAND,
            2 => EXCLAMATION,
            _ => ASTERISK,
        }) != 0
    }
    #[cfg(not(windows))]
    {
        let _ = urgency;
        false
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&db_url(), sql_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            read_save,
            save_path,
            ollama_chat,
            tuipet_status,
            launch_tuipet,
            beep,
            db_url
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last: Option<Option<std::time::SystemTime>> = None;
                loop {
                    let path = save_file();
                    let mtime = fs::metadata(&path).and_then(|m| m.modified()).ok();
                    if last.is_some() && Some(mtime) != last {
                        // changed (or vanished): push fresh contents (None = no save)
                        let payload = mtime
                            .is_some()
                            .then(|| fs::read_to_string(&path).ok())
                            .flatten();
                        let _ = handle.emit("save-changed", payload);
                    }
                    last = Some(mtime);
                    std::thread::sleep(Duration::from_millis(1000));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
