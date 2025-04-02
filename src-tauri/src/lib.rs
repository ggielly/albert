mod audio_splitter;
use audio_splitter::split_audio_file;
use audio_splitter::clear_chunks;

const CHUNK_DURATION: u64 = 10; // MP3 chunk duration in minutes

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
        .invoke_handler(tauri::generate_handler![transcribe])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


#[tauri::command(rename_all = "snake_case")]
async fn transcribe(file_path: String, session_name: String) -> Result<String, String> {
    // Split the audio file into smaller chunks
    if let Err(e) = split_audio_file(&file_path, CHUNK_DURATION, &session_name) {
        return Err(format!("Error splitting audio file: {}", e));
    }
    clear_chunks().map_err(|e| format!("Error clearing chunks: {}", e))?;
    Ok(("Fichier découpé en parties").to_string())
}