use std::path::Path;

use transcription_albert::{transcribe_audio, format_transcription};
use tokio::task;
use tokio::time::{sleep, Duration};


/// Cette fonction commence par attendre un certain temps avant de lancer 
/// la transcription pour ne pas saturer l'API Albert.
pub async fn transcribe_chunk(path: String, delay: u64, use_system_proxy: bool) -> Result<String, String> {
    // Simulate a delay
    sleep(Duration::from_secs(delay)).await;
    println!("Starting transcription after {} seconds for: {}", delay, path);

    let output_file = format!("{}.json", path);
    let path_clone = path.clone();
    let output_file_clone = output_file.clone();
    
    // En attendant d'implémenter deXZ000943146TSs fonctions async dans la bibliothèque transcription_albert
    // On met tous les appels bloquants dans une tâche spawn_blocking
    // Use spawn_blocking to offload the IO blocking operation
    let result = task::spawn_blocking(move || {
        let output_file_copy = output_file_clone.clone();
        
        let transcription = transcribe_audio(&path_clone, &output_file_clone, use_system_proxy);
        match transcription {
            Ok(_) => {
                println!("Transcription completed successfully for: {}", path_clone);
                let formatted = format_transcription_file(output_file_copy.clone()).unwrap(); // result à traiter éventuellement
                return Ok(formatted);
            }
            Err(e) => {
                eprintln!("Error during transcription: {} for {}", e, path_clone);
                return Err(path_clone);
            }
        }
    }).await; // Await the blocking task and unwrap the result
    // le spawn blocking renvoie un Result<Result<String, String>, JoinError>
        
    // Pour renvoyer le type attendu Result<String, String>
    match result {
        Ok(result_transcription) => {
            match result_transcription {
                Ok(formatted) => {
                    println!("Transcription formatted successfully: {}", formatted);
                    Ok(formatted)
                },
                Err(e) => {
                    eprintln!("Error formatting transcription: {}", e);
                    Err(format!("Error formatting transcription: {}", e))
                }
            }
        }
        Err(e) => {
            Err(format!("Erreur dans le thread de transcription : {}", e))
        }
    }
}

pub fn format_transcription_file(path: String) -> Result<String, String> {
    let trscr_dir = crate::get_transcription_directory()?;
    let filename = Path::new(&path).file_name().unwrap(); // on est sûr ici que le nom de fichier est valide
    let cleared_filename = filename.to_str().unwrap().replace(".json", "").replace(".mp3", "");

    let output_file = format!("{}/{}.txt", trscr_dir.display(), cleared_filename);
    format_transcription(&path, &output_file);

    Ok(output_file)
    
}