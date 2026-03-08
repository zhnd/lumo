//! Claude session service
//!
//! Service for reading and parsing Claude Code session data from ~/.claude folder.
//! Discovers sessions by directly scanning .jsonl files (not sessions-index.json).

use anyhow::{Context, Result};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use crate::types::{
    ClaudeContentBlock, ClaudeMessage, ClaudeSession, ClaudeSessionDetail,
    ClaudeSessionPage, ClaudeSessionStats, ClaudeToolUse, RawClaudeMessage,
};

/// Lightweight metadata extracted from a .jsonl session file.
struct SessionMeta {
    session_id: String,
    full_path: String,
    is_sidechain: bool,
    first_prompt: Option<String>,
    cwd: Option<String>,
    first_timestamp: Option<String>,
    mtime_ms: i64,
    git_branch: Option<String>,
    message_count: i32,
}

struct TitlePreview {
    text: String,
    is_command: bool,
}

struct SessionFileRef {
    path: PathBuf,
    project_path: String,
    mtime_ms: i64,
}

/// Service for Claude Code session operations
pub struct ClaudeSessionService;

impl ClaudeSessionService {
    /// Get the path to the .claude directory
    fn get_claude_dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home.join(".claude"))
    }

    /// Get the path to the projects directory
    fn get_projects_dir() -> Result<PathBuf> {
        Ok(Self::get_claude_dir()?.join("projects"))
    }

    /// Convert a project path to its .claude folder name format
    /// e.g., "/Users/zhnd/dev/projects/lumo" -> "-Users-zhnd-dev-projects-lumo"
    fn project_path_to_folder_name(project_path: &str) -> String {
        project_path.replace('/', "-")
    }

    /// Decode a folder name back to a project path.
    /// e.g., "-Users-zhnd-dev-projects-lumo" -> "/Users/zhnd/dev/projects/lumo"
    fn folder_name_to_project_path(folder_name: &str) -> String {
        if let Some(stripped) = folder_name.strip_prefix('-') {
            // Unix-style: leading dash → leading slash, remaining dashes → slashes
            format!("/{}", stripped.replace('-', "/"))
        } else {
            // Windows-style or fallback
            folder_name.replace('-', "/")
        }
    }

    fn timestamp_to_rfc3339(ms: i64) -> Option<String> {
        chrono::DateTime::from_timestamp_millis(ms).map(|dt| dt.to_rfc3339())
    }

    fn is_interruption_text(text: &str) -> bool {
        let trimmed = text.trim();
        trimmed.starts_with("[Request interrupted by user")
            || trimmed.starts_with("The user doesn't want to proceed with this tool use")
            || trimmed == "User rejected tool use"
    }

    fn extract_tag_content<'a>(content: &'a str, tag: &str) -> Option<&'a str> {
        let start_tag = format!("<{tag}>");
        let end_tag = format!("</{tag}>");
        let start = content.find(&start_tag)?;
        let rest = &content[start + start_tag.len()..];
        let end = rest.find(&end_tag)?;
        Some(rest[..end].trim())
    }

    fn collapse_whitespace(text: &str) -> String {
        text.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    fn extract_command_title(content: &str) -> Option<String> {
        let command_name = Self::extract_tag_content(content, "command-name")
            .map(str::trim)
            .filter(|value| !value.is_empty())?;
        let command_args = Self::extract_tag_content(content, "command-args")
            .map(Self::collapse_whitespace)
            .filter(|value| !value.is_empty());

        match command_args {
            Some(args) => Some(format!("{command_name} {args}")),
            None => Some(command_name.to_string()),
        }
    }

    fn sanitize_prompt_text(text: &str) -> Option<String> {
        let without_command_tags = text
            .replace("<command-name>", " ")
            .replace("</command-name>", " ")
            .replace("<command-message>", " ")
            .replace("</command-message>", " ")
            .replace("<command-args>", " ")
            .replace("</command-args>", " ");
        let collapsed = Self::collapse_whitespace(&without_command_tags);
        if collapsed.is_empty() || Self::is_interruption_text(&collapsed) {
            return None;
        }
        Some(collapsed.chars().take(200).collect())
    }

    fn extract_title_preview(value: &serde_json::Value) -> Option<TitlePreview> {
        if let Some(text) = value.as_str() {
            if let Some(command_title) = Self::extract_command_title(text) {
                return Some(TitlePreview {
                    text: command_title,
                    is_command: true,
                });
            }

            let prompt = Self::sanitize_prompt_text(text)?;
            return Some(TitlePreview {
                text: prompt,
                is_command: false,
            });
        }

        let blocks = value.as_array()?;
        let mut parts = Vec::new();

        for block in blocks {
            if block.get("type").and_then(|v| v.as_str()) != Some("text") {
                continue;
            }

            let Some(text) = block.get("text").and_then(|v| v.as_str()) else {
                continue;
            };

            if let Some(command_title) = Self::extract_command_title(text) {
                return Some(TitlePreview {
                    text: command_title,
                    is_command: true,
                });
            }

            if Self::is_interruption_text(text) {
                continue;
            }

            parts.push(text.trim());
        }

        let joined = Self::collapse_whitespace(&parts.join(" "));
        if joined.is_empty() {
            return None;
        }

        Some(TitlePreview {
            text: joined.chars().take(200).collect(),
            is_command: false,
        })
    }

    /// Extract lightweight metadata from a .jsonl session file.
    /// Reads only the first few conversational records to keep list loading fast.
    fn extract_session_meta(jsonl_path: &Path) -> Option<SessionMeta> {
        let file_name = jsonl_path.file_stem()?.to_str()?.to_string();
        let full_path = jsonl_path.to_string_lossy().to_string();

        // Skip legacy subagent files (filename starts with "agent-")
        if file_name.starts_with("agent-") {
            return None;
        }

        let file_meta = fs::metadata(jsonl_path).ok()?;
        let mtime_ms = file_meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        let file = fs::File::open(jsonl_path).ok()?;
        let reader = BufReader::new(file);

        let mut cwd: Option<String> = None;
        let mut first_prompt: Option<String> = None;
        let mut first_timestamp: Option<String> = None;
        let mut git_branch: Option<String> = None;
        let mut is_sidechain = false;
        let mut command_fallback: Option<String> = None;
        let mut inspected_entries = 0_usize;
        const MAX_INSPECTED_ENTRIES: usize = 12;

        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => break,
            };
            if line.trim().is_empty() {
                continue;
            }

            let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };

            let entry_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");

            // Skip non-conversational types
            let is_noise = matches!(
                entry_type,
                "file-history-snapshot" | "summary" | "queue-operation"
            );

            if !is_noise && val.get("isSidechain").and_then(|v| v.as_bool()) == Some(true) {
                is_sidechain = true;
            }

            if is_noise {
                continue;
            }

            inspected_entries += 1;

            if cwd.is_none() {
                if let Some(c) = val.get("cwd").and_then(|v| v.as_str()) {
                    cwd = Some(c.to_string());
                }
            }
            if first_timestamp.is_none() {
                if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
                    first_timestamp = Some(ts.to_string());
                }
            }
            if git_branch.is_none() {
                if let Some(branch) = val.get("gitBranch").and_then(|v| v.as_str()) {
                    if !branch.is_empty() {
                        git_branch = Some(branch.to_string());
                    }
                }
            }
            if first_prompt.is_none() && entry_type == "user" {
                let is_meta = val.get("isMeta").and_then(|v| v.as_bool()).unwrap_or(false);
                if !is_meta
                    && val.get("toolUseResult").is_none() {
                        if let Some(content) = val.get("message").and_then(|msg| msg.get("content"))
                        {
                            if let Some(preview) = Self::extract_title_preview(content) {
                                if preview.is_command {
                                    if command_fallback.is_none() {
                                        command_fallback = Some(preview.text);
                                    }
                                } else {
                                    first_prompt = Some(preview.text);
                                }
                            }
                        }
                    }
            }

            let has_enough_preview =
                first_prompt.is_some() && first_timestamp.is_some() && cwd.is_some();
            if has_enough_preview || inspected_entries >= MAX_INSPECTED_ENTRIES {
                break;
            }
        }

        Some(SessionMeta {
            session_id: file_name,
            full_path,
            is_sidechain,
            first_prompt: first_prompt.or(command_fallback),
            cwd,
            first_timestamp,
            mtime_ms,
            git_branch,
            message_count: 0,
        })
    }

    fn build_session_from_file(
        jsonl_path: &Path,
        project_path_hint: Option<&str>,
    ) -> Option<ClaudeSession> {
        let meta = Self::extract_session_meta(jsonl_path)?;
        let project_path = project_path_hint
            .map(ToOwned::to_owned)
            .or_else(|| meta.cwd.clone())
            .or_else(|| {
                jsonl_path
                    .parent()
                    .and_then(|parent| parent.file_name())
                    .and_then(|name| name.to_str())
                    .map(Self::folder_name_to_project_path)
            })
            .unwrap_or_default();

        Some(Self::meta_to_session(&meta, &project_path))
    }

    fn file_mtime_ms(path: &Path) -> i64 {
        fs::metadata(path)
            .and_then(|metadata| metadata.modified())
            .ok()
            .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis() as i64)
            .unwrap_or(0)
    }

    fn list_session_files_in_project_dir(project_dir: &Path, project_path: &str) -> Vec<SessionFileRef> {
        let entries = match fs::read_dir(project_dir) {
            Ok(entries) => entries,
            Err(_) => return vec![],
        };

        let mut files = Vec::new();

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
                continue;
            }

            let Some(file_name) = path.file_stem().and_then(|name| name.to_str()) else {
                continue;
            };
            if file_name.starts_with("agent-") {
                continue;
            }

            files.push(SessionFileRef {
                mtime_ms: Self::file_mtime_ms(&path),
                path,
                project_path: project_path.to_string(),
            });
        }

        files
    }

    fn list_session_files_for_scope(project_path: Option<&str>) -> Result<Vec<SessionFileRef>> {
        let projects_dir = Self::get_projects_dir()?;
        if !projects_dir.exists() {
            return Ok(vec![]);
        }

        let mut files = Vec::new();

        if let Some(project_path) = project_path {
            let folder_name = Self::project_path_to_folder_name(project_path);
            let project_dir = projects_dir.join(folder_name);
            if !project_dir.exists() {
                return Ok(vec![]);
            }

            files.extend(Self::list_session_files_in_project_dir(&project_dir, project_path));
        } else {
            for entry in fs::read_dir(&projects_dir)? {
                let entry = entry?;
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                let Some(folder_name) = path.file_name().and_then(|name| name.to_str()) else {
                    continue;
                };

                let project_path = Self::folder_name_to_project_path(folder_name);
                files.extend(Self::list_session_files_in_project_dir(&path, &project_path));
            }
        }

        files.sort_by(|a, b| b.mtime_ms.cmp(&a.mtime_ms));
        Ok(files)
    }

    fn build_sessions_from_refs(file_refs: &[SessionFileRef]) -> Vec<ClaudeSession> {
        let mut sessions = Vec::with_capacity(file_refs.len());

        for file_ref in file_refs {
            let Some(session) =
                Self::build_session_from_file(&file_ref.path, Some(&file_ref.project_path))
            else {
                continue;
            };

            if !session.is_sidechain {
                sessions.push(session);
            }
        }

        sessions
    }

    /// Convert a SessionMeta into a ClaudeSession, using the project path for context.
    fn meta_to_session(meta: &SessionMeta, project_path: &str) -> ClaudeSession {
        let created = meta
            .first_timestamp
            .clone()
            .unwrap_or_else(|| Self::timestamp_to_rfc3339(meta.mtime_ms).unwrap_or_default());
        let last_updated = Self::timestamp_to_rfc3339(meta.mtime_ms);
        let modified = last_updated.clone().unwrap_or_else(|| created.clone());

        ClaudeSession {
            session_id: meta.session_id.clone(),
            full_path: meta.full_path.clone(),
            first_prompt: meta.first_prompt.clone(),
            summary: None,
            message_count: meta.message_count,
            created,
            modified,
            last_updated,
            git_branch: meta.git_branch.clone(),
            project_path: project_path.to_string(),
            is_sidechain: meta.is_sidechain,
        }
    }

    pub fn get_sessions_page(
        project_path: Option<&str>,
        offset: usize,
        limit: usize,
    ) -> Result<ClaudeSessionPage> {
        let normalized_limit = limit.clamp(1, 100);
        let file_refs = Self::list_session_files_for_scope(project_path)?;
        let total_count = file_refs.len();
        let start = offset.min(total_count);
        let end = (start + normalized_limit).min(total_count);
        let sessions = Self::build_sessions_from_refs(&file_refs[start..end]);

        Ok(ClaudeSessionPage {
            sessions,
            offset: start as i32,
            limit: normalized_limit as i32,
            total_count: total_count as i32,
            has_more: end < total_count,
        })
    }

    /// Get session detail including messages
    pub fn get_session_detail(session_path: &str) -> Result<ClaudeSessionDetail> {
        let path = PathBuf::from(session_path);

        if !path.exists() {
            anyhow::bail!("Session file not found: {}", session_path);
        }

        let parent = path.parent().context("Invalid session path")?;
        let folder_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let project_path_decoded = Self::folder_name_to_project_path(folder_name);

        // Build session metadata from the file itself
        let session = if let Some(meta) = Self::extract_session_meta(&path) {
            let project_path = meta.cwd.clone().unwrap_or(project_path_decoded);
            Self::meta_to_session(&meta, &project_path)
        } else {
            let file_name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            ClaudeSession {
                session_id: file_name,
                full_path: session_path.to_string(),
                first_prompt: None,
                summary: None,
                message_count: 0,
                created: String::new(),
                modified: String::new(),
                last_updated: None,
                git_branch: None,
                project_path: project_path_decoded,
                is_sidechain: false,
            }
        };

        // Parse messages and stats in a single pass
        let file = fs::File::open(&path)?;
        let reader = BufReader::new(file);
        let (messages, stats) = Self::parse_session_file(reader)?;

        Ok(ClaudeSessionDetail {
            session,
            messages,
            stats,
        })
    }

    /// Parse a session JSONL file in a single pass: deduplicate streaming entries,
    /// build messages, and accumulate usage stats.
    fn parse_session_file(
        reader: impl BufRead,
    ) -> Result<(Vec<ClaudeMessage>, ClaudeSessionStats)> {
        use std::collections::HashMap;

        // Single pass: parse all lines into indexed raw messages
        let mut indexed_raws: Vec<(usize, RawClaudeMessage)> = Vec::new();
        for (line_index, line) in reader.lines().enumerate() {
            let line = match line {
                Ok(l) => l,
                Err(_) => continue,
            };
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(raw) = serde_json::from_str::<RawClaudeMessage>(&line) {
                indexed_raws.push((line_index, raw));
            }
        }

        // Build request_id → last vec_idx map for stats dedup.
        // Claude Code writes multiple JSONL entries per streaming response with the
        // same requestId but incrementally increasing token counts. Only the last
        // entry per requestId has the final usage numbers.
        let mut request_id_last_index: HashMap<String, usize> = HashMap::new();
        for (vec_idx, (_, raw)) in indexed_raws.iter().enumerate() {
            if let Some(ref rid) = raw.request_id {
                request_id_last_index.insert(rid.clone(), vec_idx);
            }
        }

        // Accumulate stats and build messages in one loop
        let mut total_input_tokens: i64 = 0;
        let mut total_output_tokens: i64 = 0;
        let mut total_cache_read_tokens: i64 = 0;
        let mut total_cache_creation_tokens: i64 = 0;
        let mut model_for_cost: Option<String> = None;
        let mut first_timestamp_str: Option<String> = None;
        let mut last_timestamp_str: Option<String> = None;
        let mut messages = Vec::new();

        for (vec_idx, (line_index, raw)) in indexed_raws.iter().enumerate() {
            // Accumulate usage stats only from the LAST entry per requestId
            // to avoid double-counting streaming intermediate entries.
            let is_last_for_request = match &raw.request_id {
                Some(rid) => request_id_last_index.get(rid) == Some(&vec_idx),
                None => true,
            };

            if is_last_for_request {
                if let Some(msg_data) = &raw.message {
                    if let Some(usage) = &msg_data.usage {
                        total_input_tokens += usage.input_tokens.unwrap_or(0);
                        total_output_tokens += usage.output_tokens.unwrap_or(0);
                        total_cache_read_tokens += usage.cache_read_input_tokens.unwrap_or(0);
                        total_cache_creation_tokens +=
                            usage.cache_creation_input_tokens.unwrap_or(0);
                    }
                    if model_for_cost.is_none() {
                        if let Some(m) = &msg_data.model {
                            model_for_cost = Some(m.clone());
                        }
                    }
                }
            }

            // Track timestamps for duration
            if let Some(ts) = &raw.timestamp {
                if first_timestamp_str.is_none() {
                    first_timestamp_str = Some(ts.clone());
                }
                last_timestamp_str = Some(ts.clone());
            }

            // Build message (skip non-conversational types like progress, summary, etc.)
            if raw.message_type != "user"
                && raw.message_type != "assistant"
                && raw.message_type != "system"
            {
                continue;
            }

            let uuid = raw
                .uuid
                .clone()
                .unwrap_or_else(|| format!("line-{}-{}", line_index, raw.message_type));
            let timestamp = raw.timestamp.clone().unwrap_or_default();

            let (text, tool_uses, blocks) = if let Some(msg_data) = &raw.message {
                if let Some(content_value) = &msg_data.content {
                    Self::parse_content(content_value, raw.tool_use_result.as_ref())
                } else {
                    (None, vec![], vec![])
                }
            } else if let Some(txt) = &raw.content {
                let block = ClaudeContentBlock {
                    block_type: "text".to_string(),
                    text: Some(txt.clone()),
                    tool_use_id: None,
                    name: None,
                    input: None,
                    output: None,
                    raw_json: None,
                    file_path: None,
                    file_content: None,
                    is_error: None,
                };
                (Some(txt.clone()), vec![], vec![block])
            } else {
                (None, vec![], vec![])
            };

            let model = raw.message.as_ref().and_then(|m| m.model.clone());

            let has_text = text.as_ref().map(|t| !t.trim().is_empty()).unwrap_or(false);
            let has_blocks = blocks.iter().any(Self::block_has_visible_content);
            let has_tool_uses = !tool_uses.is_empty();

            if !has_text && !has_tool_uses && !has_blocks {
                continue;
            }

            messages.push(ClaudeMessage {
                uuid,
                message_type: raw.message_type.clone(),
                timestamp,
                text,
                tool_uses,
                blocks,
                model,
            });
        }

        // Deduplicate messages by uuid: streaming writes the same uuid multiple
        // times with progressively more content. Keep the last (most complete) entry.
        let mut seen_uuids: HashMap<String, usize> = HashMap::new();
        for (i, msg) in messages.iter().enumerate() {
            seen_uuids.insert(msg.uuid.clone(), i);
        }
        let unique_indices: std::collections::HashSet<usize> =
            seen_uuids.values().cloned().collect();
        messages = messages
            .into_iter()
            .enumerate()
            .filter(|(i, _)| unique_indices.contains(i))
            .map(|(_, m)| m)
            .collect();

        // Compute duration
        let duration_seconds = match (&first_timestamp_str, &last_timestamp_str) {
            (Some(f), Some(l)) => {
                let first = chrono::DateTime::parse_from_rfc3339(f);
                let last = chrono::DateTime::parse_from_rfc3339(l);
                match (first, last) {
                    (Ok(f), Ok(l)) => (l - f).num_seconds().max(0),
                    _ => 0,
                }
            }
            _ => 0,
        };

        let estimated_cost_usd = Self::estimate_cost(
            &model_for_cost.unwrap_or_default(),
            total_input_tokens,
            total_output_tokens,
            total_cache_read_tokens,
            total_cache_creation_tokens,
        );

        let stats = ClaudeSessionStats {
            total_input_tokens: total_input_tokens as i32,
            total_output_tokens: total_output_tokens as i32,
            total_cache_read_tokens: total_cache_read_tokens as i32,
            total_cache_creation_tokens: total_cache_creation_tokens as i32,
            estimated_cost_usd,
            duration_seconds: duration_seconds as i32,
        };

        Ok((messages, stats))
    }

    /// Estimate cost in USD based on model and token counts
    fn estimate_cost(
        model: &str,
        input: i64,
        output: i64,
        cache_read: i64,
        cache_creation: i64,
    ) -> f64 {
        // Per million token pricing
        let (input_rate, output_rate, cache_read_rate, cache_creation_rate) =
            if model.contains("opus") {
                (15.0, 75.0, 1.875, 18.75)
            } else if model.contains("haiku") {
                (0.80, 4.0, 0.08, 1.0)
            } else {
                // Default to Sonnet pricing
                (3.0, 15.0, 0.30, 3.75)
            };

        let per_m = 1_000_000.0;
        (input as f64 * input_rate
            + output as f64 * output_rate
            + cache_read as f64 * cache_read_rate
            + cache_creation as f64 * cache_creation_rate)
            / per_m
    }

    /// Parse content value into text and tool uses
    fn parse_content(
        value: &serde_json::Value,
        tool_use_result: Option<&serde_json::Value>,
    ) -> (Option<String>, Vec<ClaudeToolUse>, Vec<ClaudeContentBlock>) {
        match value {
            serde_json::Value::String(s) => {
                let block = ClaudeContentBlock {
                    block_type: "text".to_string(),
                    text: Some(s.clone()),
                    tool_use_id: None,
                    name: None,
                    input: None,
                    output: None,
                    raw_json: None,
                    file_path: None,
                    file_content: None,
                    is_error: None,
                };
                (Some(s.clone()), vec![], vec![block])
            }
            serde_json::Value::Array(arr) => {
                let mut text_parts = Vec::new();
                let mut tool_uses = Vec::new();
                let mut blocks = Vec::new();

                for item in arr {
                    if let Some(obj) = item.as_object() {
                        let block_type = obj.get("type").and_then(|v| v.as_str());

                        match block_type {
                            Some("text") => {
                                if let Some(text) = obj.get("text").and_then(|v| v.as_str()) {
                                    text_parts.push(text.to_string());
                                    blocks.push(ClaudeContentBlock {
                                        block_type: "text".to_string(),
                                        text: Some(text.to_string()),
                                        tool_use_id: None,
                                        name: None,
                                        input: None,
                                        output: None,
                                        raw_json: None,
                                        file_path: None,
                                        file_content: None,
                                        is_error: None,
                                    });
                                }
                            }
                            Some("tool_use") => {
                                if let (Some(id), Some(name)) = (
                                    obj.get("id").and_then(|v| v.as_str()),
                                    obj.get("name").and_then(|v| v.as_str()),
                                ) {
                                    let input = obj
                                        .get("input")
                                        .map(|v| serde_json::to_string(v).unwrap_or_default());

                                    tool_uses.push(ClaudeToolUse {
                                        id: id.to_string(),
                                        name: name.to_string(),
                                        input: input.clone(),
                                    });

                                    blocks.push(ClaudeContentBlock {
                                        block_type: "tool_use".to_string(),
                                        text: None,
                                        tool_use_id: Some(id.to_string()),
                                        name: Some(name.to_string()),
                                        input,
                                        output: None,
                                        raw_json: None,
                                        file_path: None,
                                        file_content: None,
                                        is_error: None,
                                    });
                                }
                            }
                            Some("tool_result") => {
                                let tool_use_id = obj
                                    .get("tool_use_id")
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                let output =
                                    obj.get("content").or_else(|| obj.get("output")).map(|v| {
                                        if let Some(s) = v.as_str() {
                                            s.to_string()
                                        } else {
                                            serde_json::to_string(v).unwrap_or_default()
                                        }
                                    });
                                let is_error = obj.get("is_error").and_then(|v| v.as_bool());
                                let raw_json =
                                    tool_use_result.and_then(|v| serde_json::to_string(v).ok());
                                let file_path = tool_use_result
                                    .and_then(|v| {
                                        v.get("file")
                                            .and_then(|f| f.get("filePath"))
                                            .or_else(|| v.get("filePath"))
                                    })
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                let file_content = tool_use_result
                                    .and_then(|v| {
                                        v.get("file")
                                            .and_then(|f| f.get("content"))
                                            .or_else(|| v.get("content"))
                                            .or_else(|| v.get("newString"))
                                    })
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                let fallback_output = tool_use_result
                                    .and_then(|v| v.get("content"))
                                    .and_then(|v| v.as_str())
                                    .map(String::from);

                                blocks.push(ClaudeContentBlock {
                                    block_type: "tool_result".to_string(),
                                    text: None,
                                    tool_use_id,
                                    name: None,
                                    input: None,
                                    output: output.or(fallback_output),
                                    raw_json,
                                    file_path,
                                    file_content,
                                    is_error,
                                });
                            }
                            Some("thinking") | Some("redacted_thinking") => {
                                let text = obj
                                    .get("thinking")
                                    .or_else(|| obj.get("text"))
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                blocks.push(ClaudeContentBlock {
                                    block_type: block_type.unwrap_or("thinking").to_string(),
                                    text,
                                    tool_use_id: None,
                                    name: None,
                                    input: None,
                                    output: None,
                                    raw_json: None,
                                    file_path: None,
                                    file_content: None,
                                    is_error: None,
                                });
                            }
                            _ => {}
                        }
                    }
                }

                let text = if text_parts.is_empty() {
                    None
                } else {
                    Some(text_parts.join("\n"))
                };

                (text, tool_uses, blocks)
            }
            _ => (None, vec![], vec![]),
        }
    }
    fn block_has_visible_content(block: &ClaudeContentBlock) -> bool {
        match block.block_type.as_str() {
            "text" | "thinking" | "redacted_thinking" => block
                .text
                .as_ref()
                .map(|t| !t.trim().is_empty())
                .unwrap_or(false),
            "tool_use" => block
                .name
                .as_ref()
                .map(|n| !n.trim().is_empty())
                .unwrap_or(false),
            "tool_result" => {
                block
                    .output
                    .as_ref()
                    .map(|o| !o.trim().is_empty())
                    .unwrap_or(false)
                    || block
                        .file_content
                        .as_ref()
                        .map(|c| !c.trim().is_empty())
                        .unwrap_or(false)
                    || block
                        .raw_json
                        .as_ref()
                        .map(|j| !j.trim().is_empty())
                        .unwrap_or(false)
            }
            _ => false,
        }
    }
}
