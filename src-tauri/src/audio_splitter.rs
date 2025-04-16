use mp3_splitter::minutes_to_duration as mp3_minutes_to_duration;
use mp3_splitter::split_mp3;
use mp3_splitter::SplitOptions as Mp3SplitOptions;
use std::path::Path;
use wav_splitter::minutes_to_duration as wav_minutes_to_duration;
use wav_splitter::split_wav;
use wav_splitter::SplitOptions as WavSplitOptions;

/// Ce fichier contient la logique de découpage des fichiers audio en chunks.
/// Il utilise les bibliothèques mp3_splitter et wav_splitter pour effectuer le découpage.
/// Il stocke les fichiers chunks dans un répertoire spécifique dans le dossier de téléchargement de l'utilisateur.

pub fn split_audio_file(
    file_path: &str,
    split_duration_minutes: u64,
    session_name: &str,
) -> Result<Vec<String>, String> {
    // Sanitize the session name first
    let sanitized_session = sanitize_filename(session_name);

    // Get the user's download directory
    let output_dir = crate::get_chunk_directory()?;
    println!("Output directory: {}", output_dir.display());

    // Ensure directory exists
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create chunk directory: {}", e))?;

    // Check if the file is a WAV or MP3 file
    let file_extension = Path::new(file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    println!("File extension: {}", file_extension);

    // stockage des chemins des fichiers créés
    let mut chunk_paths: Vec<String> = Vec::with_capacity(50);

    // Determine the split options based on the file type
    if file_extension == "mp3" {
        let mp3_options = Mp3SplitOptions {
            input_path: Path::new(file_path),
            chunk_duration: mp3_minutes_to_duration(split_duration_minutes), // Convert minutes to Duration
            output_dir: &output_dir,    // Directory to save the chunks
            prefix: &sanitized_session, // Sanitized prefix for output files
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
            output_dir: &output_dir,    // Directory to save the chunks
            prefix: &sanitized_session, // Sanitized prefix for output files
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

/// Sanitizes a filename by removing invalid chars and replacing path separators
/// - Replaces path separators (/ and \) with underscores
/// - Replaces other invalid characters with dots
/// - Collapses consecutive dots
/// - Ensures a minimum length of 4 characters ("chunk")
/// - Limits maximum length to 255 characters
fn sanitize_filename(input: &str) -> String {
    let mut sanitized = String::with_capacity(input.len());
    let mut last_char: Option<char> = None;

    for c in input.chars() {
        // Determine the replacement character
        let processed = if c.is_alphanumeric() || c == '_' || c == '-' || c == '.' {
            // Keep valid characters as-is
            c
        } else if c == '/' || c == '\\' {
            // Replace path separators with underscore
            '_'
        } else {
            // Replace other invalid characters with dot
            '.'
        };

        // Collapse consecutive dots
        if processed == '.' && last_char == Some('.') {
            continue;
        }

        sanitized.push(processed);
        last_char = Some(processed);
    }

    // Trim trailing dots and underscores
    let trimmed = sanitized.trim_end_matches(|c| c == '.' || c == '_');

    // Handle empty results
    let mut result = if trimmed.is_empty() {
        "chunk".to_string()
    } else {
        trimmed.to_string()
    };

    // Truncate to max 255 chars
    result.truncate(255);
    result
}

/// Tests for the sanitize_filename function
#[cfg(test)]
mod albert_tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        // Basic valid filename stays the same
        assert_eq!(sanitize_filename("valid_name"), "valid_name");

        // Invalid characters are replaced with dots
        assert_eq!(
            sanitize_filename("file:name*with?invalid<chars"),
            "file.name.with.invalid.chars"
        );

        // Empty input becomes "chunk"
        assert_eq!(sanitize_filename(""), "chunk");

        // Very long names are truncated to 255 chars
        assert_eq!(sanitize_filename(&"a".repeat(300)), "a".repeat(255));

        // Folder separators become underscores
        assert_eq!(sanitize_filename("folder/file"), "folder_file");
        assert_eq!(sanitize_filename("folder\\file"), "folder_file");

        // Consecutive dots are collapsed
        assert_eq!(sanitize_filename("file....name"), "file.name");

        // Leading dots are preserved (important for security)
        assert_eq!(sanitize_filename(".hidden"), ".hidden");

        // Trailing dots are trimmed
        assert_eq!(sanitize_filename("filename..."), "filename");

        // Leading and trailing underscores: leading preserved, trailing trimmed
        assert_eq!(sanitize_filename("_filename_"), "_filename");

        // All invalid chars becomes "chunk" after trimming
        assert_eq!(sanitize_filename("///\\\\:::"), "chunk");

        // Unicode characters are handled properly
        assert_eq!(sanitize_filename("résumé.pdf"), "résumé.pdf");
        assert_eq!(sanitize_filename("файл.txt"), "файл.txt");

        // Mixed path separators
        assert_eq!(sanitize_filename("path/to\\file"), "path_to_file");
    }
}
