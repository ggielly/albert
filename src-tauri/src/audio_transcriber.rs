use std::path::Path;
use transcription_albert::{format_transcription, transcribe_audio_async};

pub async fn transcribe_chunk(path: String, use_system_proxy: bool, language: Option<String>) -> Result<String, String> {
    println!("Starting transcription for: {} in language: {}", path, language.as_deref().unwrap_or("fr"));

    let output_file = format!("{}.json", path);
    
    // Set the language to French if none is provided
    let lang = language.unwrap_or_else(|| "fr".to_string());
    
    // Call the async transcription function directly without spawning a thread
    match transcribe_audio_async(&path, &output_file, use_system_proxy, &lang).await {
        Ok(_) => {
            println!("Transcription completed successfully for: {}", path);
            // Format the transcription into a readable text file
            match format_transcription_file(output_file.clone()) {
                Ok(formatted_path) => {
                    println!("Transcription formatted successfully: {}", formatted_path);
                    Ok(formatted_path)
                }
                Err(e) => {
                    eprintln!("Error formatting transcription: {}", e);
                    Err(format!("Error formatting transcription: {}", e))
                }
            }
        }
        Err(e) => {
            eprintln!("Error during transcription: {} for {}", e, path);
            Err(format!("Error during transcription: {} for {}", e, path))
        }
    }
}

pub fn format_transcription_file(path: String) -> Result<String, String> {
    let trscr_dir = crate::get_transcription_directory()?;
    let filename = Path::new(&path).file_name().unwrap(); // on est sûr ici que le nom de fichier est valide
    let cleared_filename = filename
        .to_str()
        .unwrap()
        .replace(".json", "")
        .replace(".wav", "")
        .replace(".mp3", "");

    let output_file = format!("{}/{}.txt", trscr_dir.display(), cleared_filename);
    format_transcription(&path, &output_file);

    Ok(output_file)
}
