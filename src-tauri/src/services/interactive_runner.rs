//! Generic PTY runner for interactive CLI commands.
//!
//! Ported from ClaudeBar's `InteractiveRunner.swift`. Spawns a child process
//! inside a pseudo-terminal so React/Ink-based TUI applications (like the
//! Claude Code CLI) run correctly, collects output, and auto-responds to
//! known prompts. Exits when the child finishes, the total timeout elapses,
//! or the idle timeout has been reached after meaningful output was seen.

use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use anyhow::{Context, Result};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};

/// Configuration for a single interactive run.
pub struct RunOptions {
    pub args: Vec<String>,
    /// Additional text to write to the child's stdin after launch (e.g. slash
    /// commands typed into a REPL). A trailing `\r` is appended automatically.
    pub input: Option<String>,
    /// Hard cap on total runtime.
    pub timeout: Duration,
    /// If no new meaningful data arrives for this long AND we already have
    /// meaningful output buffered, terminate the child and return.
    pub idle_timeout: Duration,
    pub working_directory: Option<PathBuf>,
    /// Environment variable names to strip from the child's environment.
    pub env_exclusions: Vec<String>,
    /// Substring → response pairs. When the buffer contains the substring,
    /// the response is written to stdin and the prompt is marked as answered.
    pub auto_responses: Vec<(String, String)>,
}

impl Default for RunOptions {
    fn default() -> Self {
        Self {
            args: Vec::new(),
            input: None,
            timeout: Duration::from_secs(20),
            idle_timeout: Duration::from_secs(3),
            working_directory: None,
            env_exclusions: Vec::new(),
            auto_responses: Vec::new(),
        }
    }
}

/// Run an interactive CLI command inside a PTY and capture its output as raw
/// bytes (including ANSI escape sequences — feed the result into a terminal
/// renderer if you want clean text).
pub fn run_interactive(binary: &std::path::Path, options: RunOptions) -> Result<Vec<u8>> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 50,
            cols: 160,
            pixel_width: 0,
            pixel_height: 0,
        })
        .context("Failed to open PTY")?;

    let mut cmd = CommandBuilder::new(binary);
    for arg in &options.args {
        cmd.arg(arg);
    }
    if let Some(cwd) = &options.working_directory {
        cmd.cwd(cwd);
    }

    // Build an environment for the child. portable-pty inherits the current
    // process environment by default only if we don't set any variables, so
    // we explicitly copy everything except the excluded vars.
    for (key, value) in std::env::vars() {
        if options.env_exclusions.iter().any(|k| k == &key) {
            continue;
        }
        cmd.env(key, value);
    }

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .context("Failed to spawn command in PTY")?;

    // We don't need the slave handle after spawning the child.
    drop(pair.slave);

    let mut writer = pair
        .master
        .take_writer()
        .context("Failed to take PTY writer")?;
    let mut reader = pair
        .master
        .try_clone_reader()
        .context("Failed to clone PTY reader")?;

    // Let the child initialize (matches ClaudeBar's 400ms pause).
    thread::sleep(Duration::from_millis(400));

    // Send the input command, if any. React/Ink apps expect a terminal-style
    // carriage return rather than a newline.
    if let Some(ref input) = options.input {
        let trimmed = input.trim();
        if !trimmed.is_empty() {
            writer
                .write_all(trimmed.as_bytes())
                .context("Failed to send input")?;
            writer
                .write_all(b"\r")
                .context("Failed to send input terminator")?;
            writer.flush().ok();
        }
    }

    // Buffer is shared between the reader thread and the main loop so we can
    // inspect it for auto-response prompts without racing the reader.
    let buffer: Arc<Mutex<Vec<u8>>> = Arc::new(Mutex::new(Vec::new()));
    let buffer_reader = Arc::clone(&buffer);
    let reader_done = Arc::new(Mutex::new(false));
    let reader_done_clone = Arc::clone(&reader_done);

    thread::spawn(move || {
        let mut chunk = [0u8; 4096];
        loop {
            match reader.read(&mut chunk) {
                Ok(0) => break,
                Ok(n) => {
                    if let Ok(mut buf) = buffer_reader.lock() {
                        buf.extend_from_slice(&chunk[..n]);
                    }
                }
                Err(_) => break,
            }
        }
        if let Ok(mut done) = reader_done_clone.lock() {
            *done = true;
        }
    });

    let deadline = Instant::now() + options.timeout;
    let mut last_meaningful_at = Instant::now();
    let mut last_len = 0usize;
    let mut responded: Vec<bool> = vec![false; options.auto_responses.len()];

    loop {
        // Snapshot the buffer for inspection
        let snapshot = match buffer.lock() {
            Ok(b) => b.clone(),
            Err(_) => break,
        };

        // Track meaningful data
        if snapshot.len() > last_len {
            let new_data = &snapshot[last_len..];
            if has_meaningful_content(new_data) {
                last_meaningful_at = Instant::now();
            }
            last_len = snapshot.len();
        }

        // Auto-respond to prompts we haven't already answered
        for (idx, (prompt, response)) in options.auto_responses.iter().enumerate() {
            if responded[idx] {
                continue;
            }
            if contains_subslice(&snapshot, prompt.as_bytes()) {
                if writer.write_all(response.as_bytes()).is_ok() {
                    writer.flush().ok();
                }
                responded[idx] = true;
                last_meaningful_at = Instant::now();
            }
        }

        // Exit conditions
        let child_done = child.try_wait().ok().flatten().is_some();
        if child_done {
            break;
        }

        let reader_done_flag = reader_done.lock().map(|d| *d).unwrap_or(false);
        if reader_done_flag {
            break;
        }

        if Instant::now() >= deadline {
            log::debug!("InteractiveRunner: hard timeout hit");
            break;
        }

        // Idle exit: we have meaningful content and nothing new has arrived
        // in `idle_timeout`. Don't exit prematurely when the buffer is still
        // empty (the child might still be starting up).
        if has_meaningful_content(&snapshot)
            && Instant::now().duration_since(last_meaningful_at) >= options.idle_timeout
        {
            break;
        }

        thread::sleep(Duration::from_millis(60));
    }

    // Force-stop the child if it's still running
    let _ = child.kill();
    let _ = child.wait();

    // One last read of whatever is in the buffer
    let final_buffer = buffer.lock().map(|b| b.clone()).unwrap_or_default();
    Ok(final_buffer)
}

/// Returns true if the buffer contains the given sub-slice. Linear scan is
/// fine here since buffers stay small (a few KB of terminal output).
fn contains_subslice(haystack: &[u8], needle: &[u8]) -> bool {
    if needle.is_empty() || needle.len() > haystack.len() {
        return false;
    }
    haystack.windows(needle.len()).any(|w| w == needle)
}

/// Returns true if the data contains anything beyond ANSI escape sequences.
/// Ported from ClaudeBar's `hasMeaningfulContent` — the goal is to avoid
/// resetting the idle timer on cursor movement, title updates, and other
/// non-visible noise that the terminal keeps emitting while rendering.
fn has_meaningful_content(data: &[u8]) -> bool {
    // Decode as UTF-8; if it fails, treat as meaningful (binary data).
    let Ok(text) = std::str::from_utf8(data) else {
        return !data.is_empty();
    };

    let mut stripped = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch != '\x1b' {
            stripped.push(ch);
            continue;
        }
        // We saw ESC; classify the sequence
        let Some(&next) = chars.peek() else {
            continue;
        };

        match next {
            '[' => {
                // CSI sequence: ESC [ <params> <final letter>
                chars.next();
                for c in chars.by_ref() {
                    if c.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
            '(' | ')' => {
                // Charset designator: ESC ( <byte>
                chars.next();
                chars.next();
            }
            ']' => {
                // OSC sequence: ESC ] ... BEL or ESC ] ... ESC \
                chars.next();
                while let Some(&c) = chars.peek() {
                    chars.next();
                    if c == '\x07' {
                        break;
                    }
                    if c == '\x1b' {
                        // Skip the terminating backslash
                        if let Some(&b) = chars.peek() {
                            if b == '\\' {
                                chars.next();
                            }
                        }
                        break;
                    }
                }
            }
            _ => {
                // Unknown escape — just drop the ESC
            }
        }
    }

    stripped
        .chars()
        .any(|c| !c.is_whitespace() && c != '\u{07}')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn meaningful_content_detects_plain_text() {
        assert!(has_meaningful_content(b"hello"));
    }

    #[test]
    fn meaningful_content_ignores_csi_only() {
        assert!(!has_meaningful_content(b"\x1b[2J\x1b[H"));
    }

    #[test]
    fn meaningful_content_ignores_osc_title() {
        assert!(!has_meaningful_content(b"\x1b]0;title\x07"));
    }

    #[test]
    fn meaningful_content_detects_text_with_ansi() {
        assert!(has_meaningful_content(b"\x1b[32mhello\x1b[0m"));
    }

    #[test]
    fn contains_subslice_works() {
        assert!(contains_subslice(b"hello world", b"world"));
        assert!(!contains_subslice(b"hello", b"world"));
        assert!(!contains_subslice(b"ab", b"abc"));
    }
}
