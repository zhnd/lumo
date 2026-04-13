//! Renders raw terminal output (containing ANSI escape sequences) into
//! clean, line-oriented text by feeding it through a VT100 emulator.
//!
//! This is the Rust equivalent of ClaudeBar's `TerminalRenderer.swift`, which
//! wraps SwiftTerm to handle cursor movement, screen clearing, and other
//! control sequences that would otherwise corrupt captured PTY output.

/// Default dimensions used for the headless terminal. Matches ClaudeBar so
/// we parse the same rendered layout.
const DEFAULT_ROWS: u16 = 50;
const DEFAULT_COLS: u16 = 160;

pub struct TerminalRenderer {
    rows: u16,
    cols: u16,
}

impl TerminalRenderer {
    pub fn new() -> Self {
        Self {
            rows: DEFAULT_ROWS,
            cols: DEFAULT_COLS,
        }
    }

    /// Feed raw bytes through a vt100 parser and return the rendered screen
    /// text, trimmed of trailing empty rows.
    pub fn render(&self, raw: &[u8]) -> String {
        let mut parser = vt100::Parser::new(self.rows, self.cols, 0);
        parser.process(raw);

        let contents = parser.screen().contents();

        // Trim trailing empty lines so the parser doesn't have to walk empty
        // rows. `contents()` pads every row to `cols`, so internal empty rows
        // are just newlines.
        let trimmed_end = contents.trim_end_matches(['\n', ' ']);
        trimmed_end.to_string()
    }
}

impl Default for TerminalRenderer {
    fn default() -> Self {
        Self::new()
    }
}
