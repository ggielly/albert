use mp3_splitter::split_mp3;
use mp3_splitter::SplitOptions;
use mp3_splitter::minutes_to_duration;
use std::path::Path;

/// Ce fichier contient la logique de découpage des fichiers audio mp3 en chunks.
/// Il utilise la bibliothèque mp3_splitter pour effectuer le découpage.
/// Il stocke les fichiers chunks dans un répertoire spécifique dans le dossier de téléchargement de l'utilisateur.

pub fn split_audio_file(file_path: &str, split_duration: u64, session_name: &str) -> Result<Vec<String>, String> {
    // Get the user's download directory
    let output_dir = crate::get_chunk_directory()?;
    println!("Output directory: {}", output_dir.display());
    let options = SplitOptions {
        input_path: Path::new(file_path),
        chunk_duration: minutes_to_duration(split_duration), // Convert minutes to Duration
        output_dir: &output_dir, // Directory to save the chunks
        prefix: session_name, // Prefix for output files
    };

    // Perform the split
    let mut chunk_paths: Vec<String> = vec![];
    match split_mp3(&options) {
        Ok(result) => {
            println!("Split into {} chunks", result.chunk_count);
            
            // Access information about the split
            println!("Total duration: {:.2} minutes", result.total_duration.as_secs_f64() / 60.0);
            
            // You can also access all output file paths
            for path in result.output_files {
                chunk_paths.push(path.display().to_string());
                println!("Created: {}", path.display());
            }
        },
        Err(e) => { 
            eprintln!("Error: {}", e);
            return Err(format!("Error splitting audio file: {}", e));
        }
    }

    Ok(chunk_paths)
}

/// Clears the chunks directory by removing all files and subdirectories
pub fn clear_chunks() -> Result<(), String> {
    // Get the user's download directory
    
    let chunk_dir = crate::get_chunk_directory()?;
    println!("Chunk directory: {}", chunk_dir.display());

    // Check if the directory exists
    if !chunk_dir.exists() {
        return Ok(());  // Directory doesn't exist, nothing to clear
    }
    // Remove the directory and its contents
    match std::fs::remove_dir_all(&chunk_dir) {
        Ok(_) => {
            println!("Successfully cleared chunks");
            Ok(())
        },
        Err(e) => {
            eprintln!("Error clearing chunks: {}", e);
            Err(format!("Error clearing chunks: {}", e))
        }
    }
}

