mod audio_splitter;
mod audio_transcriber;
use audio_splitter::split_audio_file;
use audio_splitter::clear_chunks;
use std::path::{Path, PathBuf};
use directories::UserDirs;

const CHUNK_DURATION: u64 = 10; // MP3 chunk duration in minutes
const CHUNK_DIRECTORY: &str = "mp3_chunks";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![split_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


#[tauri::command(rename_all = "snake_case")]
async fn split_file(file_path: String, session_name: String) -> Result<Vec<String>, String> {
    // Split the audio file into smaller chunks
    match split_audio_file(&file_path, CHUNK_DURATION, &session_name) {
        Ok(chunk_paths) => {
            println!("Audio file split successfully");
            return Ok(chunk_paths);
        }
        Err(e) => {
            eprintln!("Error splitting audio file: {}", e);
            return Err(format!("Error splitting audio file: {}", e));
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn send_chunk_to_albert() -> Result<String, String> {
    // Function body is empty in the original
    Ok("Not implemented yet".to_string())
}

/// Returns the path to the directory where audio chunks will be stored
pub fn get_chunk_directory() -> Result<PathBuf, String> {
    // Get the user's download directory
    let usr_dir: UserDirs;
    if let Some(user_dirs) = UserDirs::new() {
        usr_dir = user_dirs;
    } else {
        return Err("User directory not found".to_string());
    };
    let dld_dir: &Path;
        if let Some(download_dir) = usr_dir.download_dir() {
        dld_dir = download_dir;
    } else {
        return Err("Dowload directory not found".to_string());
    };
    
    let output_dir = dld_dir.join(CHUNK_DIRECTORY);
    Ok(output_dir)
}