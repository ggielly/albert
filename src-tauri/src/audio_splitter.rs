use mp3_splitter::split_mp3;
use mp3_splitter::SplitOptions;
use mp3_splitter::minutes_to_duration;
use std::path::Path;
use std::path::PathBuf;
use directories::UserDirs;

const CHUNK_DIRECTORY: &str = "mp3_chunks";

pub fn split_audio_file(file_path: &str, split_duration: u64, session_name: &str) -> Result<String, String> {
    // Get the user's download directory
    let output_dir = get_chunk_directory()?;
    println!("Output directory: {}", output_dir.display());
    let options = SplitOptions {
        input_path: Path::new(file_path),
        chunk_duration: minutes_to_duration(split_duration), // Convert minutes to Duration
        output_dir: &output_dir, // Directory to save the chunks
        prefix: session_name, // Prefix for output files
    };

    // Perform the split
    match split_mp3(&options) {
        Ok(result) => {
            println!("Split into {} chunks", result.chunk_count);
            
            // Access information about the split
            println!("Total duration: {:.2} minutes", result.total_duration.as_secs_f64() / 60.0);
            
            // You can also access all output file paths
            for path in result.output_files {
                println!("Created: {}", path.display());
            }
        },
        Err(e) => { 
            eprintln!("Error: {}", e);
            return Err(format!("Error splitting audio file: {}", e));
        }
    }

    Ok(format!("Audio file split successfully into {} chunks", split_duration))
}


/// Clears the chunks directory by removing all files and subdirectories
pub fn clear_chunks() -> Result<(), String> {
    // Get the user's download directory
    
    let chunk_dir = get_chunk_directory()?;
    println!("Chunk directory: {}", chunk_dir.display());

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

fn get_chunk_directory() -> Result<PathBuf, String> {
    // Get the user's download directory
    let usr_dir: UserDirs;
    if let Some(user_dirs) = UserDirs::new() {
        usr_dir = user_dirs;
    } else {
        return Err("User directory not found".to_string());
    };
    let dld_dir: &Path;
        if let Some(download_dir) = usr_dir.download_dir() {
        dld_dir = download_dir;
    } else {
        return Err("Dowload directory not found".to_string());
    };
    
    let output_dir = dld_dir.join(CHUNK_DIRECTORY);
    Ok(output_dir)
}