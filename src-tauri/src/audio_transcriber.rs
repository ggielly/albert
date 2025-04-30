use std::path::Path;
use transcription_albert::{
    download_encrypted_api_key, format_transcription, transcribe_audio_async,
};

/// Transcribe a chunk of audio
/// Returns the path to the transcription file after formatting in Ok(String)
pub async fn transcribe_chunk(
    path: String,
    keypath: String,
    use_system_proxy: bool,
    language: Option<String>,
    label: Option<String>,
) -> Result<String, String> {
    println!(
        "Starting transcription for: {} in language: {}",
        path,
        language.as_deref().unwrap_or("fr")
    );

    let output_file = format!("{}.json", path);
    let lang = language.unwrap_or_else(|| "fr".to_string());

    // Use ? operator to propagate errors
    transcribe_audio_async(&path, &output_file, &keypath, use_system_proxy, &lang)
        .await
        .map_err(|e| format!("Error during transcription: {} for {}", e, path))?;

    println!("Transcription completed successfully for: {}", path);

    // Format the transcription
    let formatted_path = format_transcription_file(output_file, label)?;
    println!("Transcription formatted successfully: {}", formatted_path);

    Ok(formatted_path)
}

// Returns the path of the formatted transcription file in Ok(String)
pub fn format_transcription_file(path: String, label: Option<String>) -> Result<String, String> {
    let trscr_dir = crate::get_transcription_directory()?;
    let filename = Path::new(&path).file_name().unwrap(); // on est sûr ici que le nom de fichier est valide
    let cleared_filename = filename
        .to_str()
        .unwrap()
        .replace(".json", "")
        .replace(".wav", "")
        .replace(".mp3", "");
    let output_file = format!("{}/{}.txt", trscr_dir.display(), cleared_filename);
    format_transcription(&path, &output_file, label.as_deref());
    Ok(output_file)
}

// Download the encrypted API key from the server
pub async fn download_key() {
    if let Ok(filename) = crate::get_keypath() {
        download_encrypted_api_key(&filename).await;
    } else {
        println!("Fichier de clé non trouvé");
    }
}
