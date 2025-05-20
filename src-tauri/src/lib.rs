mod audio_splitter;
mod audio_transcriber;
use audio_splitter::clear_chunks;
use audio_splitter::split_audio_file;
use audio_transcriber::download_key;
use audio_transcriber::transcribe_chunk;
use directories::UserDirs;
use std::path::{Path, PathBuf};

const CHUNK_DIRECTORY: &str = "audio_chunks";
const TRANSCRIPTION_DIRECTORY: &str = "transcriptions_albertine";
const KEY_FILE: &str = "albertine.key";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
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
        .invoke_handler(tauri::generate_handler![
            split_file,
            send_chunk,
            terminate_transcription,
            concat_transcription_files,
            download_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command(rename_all = "snake_case")]
async fn split_file(
    file_path: String,
    session_name: String,
    chunk_duration: u64,
) -> Result<Vec<String>, String> {
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
async fn send_chunk(
    path: String,
    use_system_proxy: bool,
    language: Option<String>,
    label: Option<String>,
) -> Result<String, String> {
    let keypath = get_keypath().unwrap();
    // Call the transcribe_chunk function from audio_transcriber
    let transcription = transcribe_chunk(path, keypath, use_system_proxy, language, label).await?;
    Ok(transcription)
}

/// terminate_transcriptions : clear the chunks directory
#[tauri::command(rename_all = "snake_case")]
async fn terminate_transcription(cancelled: bool) -> Result<String, String> {
    match clear_chunks() {
        Ok(_) => {
            println!("Chunks cleared successfully");
            let msg = if cancelled {
                format!("Fichiers temporaires supprimés.<br><br>Vous trouverez les éventuels fichiers texte de transcription déjà créés avant l'annulation dans le répertoire : <b>{}</b>", get_transcription_directory().unwrap().display())
            } else {
                format!("Fichiers temporaires supprimés.<br><br>Vous trouverez les fichiers texte de transcription dans le répertoire : <b>{}</b>", get_transcription_directory().unwrap().display())
            };
            Ok(msg)
        }
        Err(e) => {
            eprintln!("Error clearing chunks: {}", e);
            Err(format!("Error clearing chunks: {}", e))
        }
    }
}
/// Concats the passed files into a single file
/// transcription_chunks : Vec<String> vector of paths to the files to be concatenated
/// output_file : String path to the output file
/// Returns the path to the concatenated file as String
#[tauri::command(rename_all = "snake_case")]
async fn concat_transcription_files(
    transcription_chunks: Vec<String>,
    output_file: String,
) -> Result<String, String> {
    let transcription_dir = get_transcription_directory()?;
    let output_file_path = transcription_dir.join(output_file.clone());
    if output_file_path.exists() {
        std::fs::remove_file(&output_file_path)
            .map_err(|e| format!("Failed to remove existing file: {}", e))?;
    }
    let mut output = std::fs::File::create(&output_file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    for chunk in transcription_chunks {
        let mut input =
            std::fs::File::open(chunk).map_err(|e| format!("Failed to open file: {}", e))?;
        std::io::copy(&mut input, &mut output)
            .map_err(|e| format!("Failed to copy file: {}", e))?;
    }
    println!("fichier concaténé : {}", output_file_path.display());
    Ok(output_file)
}
/// Downloads the API Key
#[tauri::command(rename_all = "snake_case")]
async fn download_api_key() {
    download_key().await;
}

/// Returns the path to the crypted API key file
pub fn get_keypath() -> Result<String, String> {
    let usr_dirs = get_user_directories()?;
    let key_dir: &Path;
    if let Some(download_dir) = usr_dirs.download_dir() {
        key_dir = download_dir;
    } else {
        return Err("Dowload directory not found".to_string());
    };

    let keypath = key_dir.join(KEY_FILE);
    Ok(keypath.display().to_string())
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
        std::fs::create_dir_all(&output_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
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
