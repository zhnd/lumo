use tauri::command;

#[command]
pub async fn save_image_to_path(data: String, path: String) -> Result<(), String> {
    use base64::Engine;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data)
        .map_err(|e| format!("Invalid base64: {}", e))?;

    std::fs::write(&path, &bytes).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}
