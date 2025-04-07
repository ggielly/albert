mod audio_splitter;
mod audio_transcriber;
use audio_splitter::split_audio_file;
use audio_splitter::clear_chunks;
use audio_transcriber::transcribe_chunk;
use std::path::{Path, PathBuf};
use directories::UserDirs;

const CHUNK_DIRECTORY: &str = "mp3_chunks";
const TRANSCRIPTION_DIRECTORY: &str = "transcriptions_albert";

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
        .invoke_handler(tauri::generate_handler![split_file, send_chunk, terminate])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


#[tauri::command(rename_all = "snake_case")]
async fn split_file(file_path: String, session_name: String, chunk_duration: u64) -> Result<Vec<String>, String> {
    // Split the audio file into smaller chunks
    match split_audio_file(&file_path, chunk_duration, &session_name) {
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

// / Sends a chunk for transcription to Albert
#[tauri::command(rename_all = "snake_case")]
async fn send_chunk(path: String, delay: u64, use_system_proxy: bool) -> Result<String, String> {
    // Call the transcribe_chunk function from audio_transcriber
    let transcription = transcribe_chunk(path, delay, use_system_proxy).await?;
    Ok(transcription)
}

/// Terminates : clear the chunks directory
#[tauri::command(rename_all = "snake_case")]
async fn terminate() -> Result<String, String> {
    match clear_chunks() {
        Ok(_) => {
            println!("Chunks cleared successfully");
            Ok(format!("Fichiers temporaires supprimés.<br><br>Vous trouverez les fichiers texte de transcription sont dans le répertoire : <b>{}</b>", get_transcription_directory().unwrap().display()))
        }
        Err(e) => {
            eprintln!("Error clearing chunks: {}", e);
            Err(format!("Error clearing chunks: {}", e))
        }
    }
}


/// Returns the path to the directory where audio chunks will be stored
pub fn get_chunk_directory() -> Result<PathBuf, String> {
    let usr_dirs = get_user_directories()?;
    let dld_dir: &Path;
        if let Some(download_dir) = usr_dirs.download_dir() {
        dld_dir = download_dir;
    } else {
        return Err("Dowload directory not found".to_string());
    };
    
    let output_dir = dld_dir.join(CHUNK_DIRECTORY);
    Ok(output_dir)
}

/// Returns the path to the directory where transcription text files will be saved
pub fn get_transcription_directory() -> Result<PathBuf, String> {
    let usr_dirs = get_user_directories()?;
    let doc_dir: &Path;
        if let Some(document_dir) = usr_dirs.document_dir() {
        doc_dir = document_dir;
    } else {
        return Err("Documents directory not found".to_string());
    };
    
    let output_dir = doc_dir.join(TRANSCRIPTION_DIRECTORY);
    if !output_dir.exists() {
        std::fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    Ok(output_dir)
}

/// Returns the path to the user's directories
pub fn get_user_directories() -> Result<UserDirs, String> {
    if let Some(user_dirs) = UserDirs::new() {
        return Ok(user_dirs);
    } else {
        return Err("User directory not found".to_string());
    };
}

