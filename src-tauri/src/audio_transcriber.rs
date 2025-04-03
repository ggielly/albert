use std::ptr;

use transcription_albert::{transcribe_audio, format_transcription};
use tokio::task;
use tokio::time::{sleep, Duration};


/// Cette fonction commence par attendre un certain temps avant de lancer 
/// la transcription pour ne pas saturer l'API Albert.
pub async fn transcribe_chunk(path: String, delay: u64) -> Result<String, String> {
    // Simulate a delay
    sleep(Duration::from_secs(delay)).await;
    println!("Starting transcription for: {}", path);

    let output_file = format!("{}.json", path);
    let path_clone = path.clone();
    let output_file_clone = output_file.clone();
    
    // En attendant d'implémenter des fonctions async dans la bibliothèque transcription_albert
    // Use spawn_blocking to offload the CPU-intensive blocking operation
    let result = task::spawn_blocking(move || {
        transcribe_audio(&path_clone, &output_file_clone)
    }).await;
    
    match result {
        Ok(_) => {
            println!("Transcription completed successfully");
            Ok("Transcription completed successfully".to_string())
        }
        Err(e) => {
            eprintln!("Error during transcription: {}", e);
            Err(format!("Error during transcription: {}", e))
        }
    }
}