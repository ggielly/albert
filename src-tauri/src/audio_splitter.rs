use mp3_splitter::minutes_to_duration as mp3_minutes_to_duration;
use mp3_splitter::split_mp3;
use mp3_splitter::SplitOptions as Mp3SplitOptions;
use wav_splitter::SplitOptions as WavSplitOptions;
use wav_splitter::minutes_to_duration as wav_minutes_to_duration;
use wav_splitter::split_wav;
use std::path::Path;

/// Ce fichier contient la logique de découpage des fichiers audio  en chunks.
/// Il utilise les bibliothèques mp3_splitter et wav_splitter pour effectuer le découpage.
/// Il stocke les fichiers chunks dans un répertoire spécifique dans le dossier de téléchargement de l'utilisateur.

pub fn split_audio_file(
    file_path: &str,
    split_duration_minutes: u64,
    session_name: &str,
) -> Result<Vec<String>, String> {
    // Get the user's download directory
    let output_dir = crate::get_chunk_directory()?;
    println!("Output directory: {}", output_dir.display());
    // Check if the file is a WAV or MP3 file
    let file_extension = match Path::new(file_path).extension() {
        Some(ext) => ext.to_str().unwrap_or(""),
        None => "",
    };
    let file_extension = file_extension.to_lowercase();
    let file_extension = file_extension.trim_start_matches('.');
    println!("File extension: {}", file_extension);
    // stockage des chemins des fichiers créés
    let mut chunk_paths: Vec<String> = vec![];

    // Determine the split options based on the file type
    if file_extension == "mp3" {
        let mp3_options = Mp3SplitOptions {
            input_path: Path::new(file_path),
            chunk_duration: mp3_minutes_to_duration(split_duration_minutes), // Convert minutes to Duration
            output_dir: &output_dir,                                          // Directory to save the chunks
            prefix: session_name,                                             // Prefix for output files
        };

        // Perform the mp3 split
        match split_mp3(&mp3_options) {
            Ok(result) => {
                println!("Split into {} chunks", result.chunk_count);

                // Access information about the split
                println!(
                    "Total duration: {:.2} minutes",
                    result.total_duration.as_secs_f64() / 60.0
                );

                // You can also access all output file paths
                for path in result.output_files {
                    chunk_paths.push(path.display().to_string());
                    println!("Created: {}", path.display());
                }
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                return Err(format!("Error splitting audio file: {}", e));
            }
        }
    }
    // sinon on considère que c'est du wav par défaut
    else {
        let wav_options = WavSplitOptions {
            input_path: Path::new(file_path),
            chunk_duration: wav_minutes_to_duration(split_duration_minutes), // Convert minutes to Duration
            output_dir: &output_dir,                                          // Directory to save the chunks
            prefix: session_name,                                              // Prefix for output files
        };

        // Perform the wav split
        match split_wav(&wav_options) {
            Ok(result) => {
                println!("Split into {} chunks", result.chunk_count);

                // Access information about the split
                println!(
                    "Total duration: {:.2} minutes",
                    result.total_duration.as_secs_f64() / 60.0
                );

                // You can also access all output file paths
                for path in result.output_files {
                    chunk_paths.push(path.display().to_string());
                    println!("Created: {}", path.display());
                }
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                return Err(format!("Error splitting audio file: {}", e));
            }
        }
    }

    // On renvoie un OK avec la liste des fichiers créés
    Ok(chunk_paths)
}

/// Clears the chunks directory by removing all files and subdirectories
pub fn clear_chunks() -> Result<(), String> {
    // Get the user's download directory

    let chunk_dir = crate::get_chunk_directory()?;
    println!("Chunk directory: {}", chunk_dir.display());

    // Check if the directory exists
    if !chunk_dir.exists() {
        return Ok(()); // Directory doesn't exist, nothing to clear
    }
    // Remove the directory and its contents
    match std::fs::remove_dir_all(&chunk_dir) {
        Ok(_) => {
            println!("Successfully cleared chunks");
            Ok(())
        }
        Err(e) => {
            eprintln!("Error clearing chunks: {}", e);
            Err(format!("Error clearing chunks: {}", e))
        }
    }
}
