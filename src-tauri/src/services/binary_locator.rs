//! Locate CLI binaries installed by the user even when Lumo is launched
//! from Finder / Launchpad with a minimal `PATH`.
//!
//! macOS GUI apps inherit `/usr/bin:/bin:/usr/sbin:/sbin` by default, so
//! tools like `claude` installed under `~/.local/bin`, `/opt/homebrew/bin`,
//! `~/.npm-global/bin`, etc. are invisible to `which::which`. Ported from
//! ClaudeBar's `BinaryLocator.swift`.
//!
//! Strategy:
//! 1. Ask the user's **login shell** (`$SHELL -l -c 'command -v <name>'`)
//!    so it loads `.zshrc` / `.bashrc` / `.profile` and exposes the same
//!    `PATH` the user sees in a terminal.
//! 2. If that fails (sandboxed or unusual shells), walk a hand-rolled list
//!    of common install prefixes.

use std::path::{Path, PathBuf};
use std::process::Command;

/// Locate `name` on disk. Returns the first existing executable match.
pub fn locate_binary(name: &str) -> Option<PathBuf> {
    if let Some(p) = locate_via_login_shell(name) {
        return Some(p);
    }
    find_in_common_paths(name)
}

/// Run the user's login shell and ask it where `name` lives.
///
/// `command -v` is POSIX-standard and works in bash/zsh/sh/dash. For fish
/// this returns a shell function or nothing for unknown names, which is
/// fine — `locate_binary` will fall through to `find_in_common_paths`.
fn locate_via_login_shell(name: &str) -> Option<PathBuf> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let script = format!("command -v {}", shell_escape(name));

    let output = Command::new(&shell)
        .args(["-l", "-c", &script])
        .output()
        .ok()?;

    if !output.status.success() {
        log::debug!(
            "binary_locator: login shell '{}' could not resolve '{}'",
            shell,
            name
        );
        return None;
    }

    let raw = String::from_utf8(output.stdout).ok()?;
    // `command -v` may print multiple candidates separated by newlines
    // in some edge cases — take the first non-empty one.
    let candidate = raw
        .lines()
        .map(str::trim)
        .find(|s| !s.is_empty())?
        .to_string();

    let path = PathBuf::from(candidate);
    if path.is_file() && is_executable(&path) {
        log::debug!(
            "binary_locator: found '{}' via login shell at {}",
            name,
            path.display()
        );
        Some(path)
    } else {
        None
    }
}

/// Check a hand-rolled list of common install prefixes for `name`. Matches
/// ClaudeBar's list so Homebrew / nix / npm / cargo / pnpm / nvm installs
/// are all covered.
fn find_in_common_paths(name: &str) -> Option<PathBuf> {
    let home = dirs::home_dir();

    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(home) = home.as_ref() {
        candidates.push(home.join(".local/bin"));
        candidates.push(home.join(".cargo/bin"));
        candidates.push(home.join("bin"));
        candidates.push(home.join(".nix-profile/bin"));
        candidates.push(home.join(".npm-global/bin"));
        candidates.push(home.join("Library/pnpm"));
    }
    candidates.push(PathBuf::from("/opt/homebrew/bin"));
    candidates.push(PathBuf::from("/usr/local/bin"));
    candidates.push(PathBuf::from("/run/current-system/sw/bin"));
    candidates.push(PathBuf::from("/nix/var/nix/profiles/default/bin"));
    candidates.push(PathBuf::from("/usr/local/lib/node_modules/.bin"));

    for base in &candidates {
        let p = base.join(name);
        if p.is_file() && is_executable(&p) {
            log::debug!(
                "binary_locator: found '{}' in common path at {}",
                name,
                p.display()
            );
            return Some(p);
        }
    }

    // nvm / Herd: `{base}/node/vX.Y.Z/bin/{name}`, pick the highest version.
    if let Some(home) = home.as_ref() {
        let nvm_roots = [
            home.join(".nvm/versions/node"),
            home.join("Library/Application Support/Herd/config/nvm/versions/node"),
        ];
        for root in &nvm_roots {
            if let Some(p) = find_in_nvm_versions(root, name) {
                return Some(p);
            }
        }
    }

    None
}

/// Walk `root/{version}/bin/{name}` and return the highest numerically
/// sorted version that contains an executable match.
fn find_in_nvm_versions(root: &Path, name: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(root).ok()?;
    let mut versions: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();
    // Sort descending, numerically (v22.1.0 > v22.0.9 > v18.17.0)
    versions.sort_by(|a, b| human_sort_cmp(b, a));

    for version in versions {
        let bin = root.join(&version).join("bin").join(name);
        if bin.is_file() && is_executable(&bin) {
            log::debug!(
                "binary_locator: found '{}' under nvm at {}",
                name,
                bin.display()
            );
            return Some(bin);
        }
    }
    None
}

/// Lightweight numeric-aware comparison used for nvm version sorting.
/// Splits both strings into runs of digits vs non-digits and compares
/// digit runs as numbers.
fn human_sort_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    let mut ai = a.chars().peekable();
    let mut bi = b.chars().peekable();
    loop {
        match (ai.peek(), bi.peek()) {
            (None, None) => return Ordering::Equal,
            (None, _) => return Ordering::Less,
            (_, None) => return Ordering::Greater,
            (Some(&x), Some(&y)) => {
                if x.is_ascii_digit() && y.is_ascii_digit() {
                    let mut an: u64 = 0;
                    while let Some(&c) = ai.peek() {
                        if !c.is_ascii_digit() {
                            break;
                        }
                        an = an.saturating_mul(10) + (c as u64 - '0' as u64);
                        ai.next();
                    }
                    let mut bn: u64 = 0;
                    while let Some(&c) = bi.peek() {
                        if !c.is_ascii_digit() {
                            break;
                        }
                        bn = bn.saturating_mul(10) + (c as u64 - '0' as u64);
                        bi.next();
                    }
                    match an.cmp(&bn) {
                        Ordering::Equal => continue,
                        other => return other,
                    }
                } else {
                    let cmp = x.cmp(&y);
                    ai.next();
                    bi.next();
                    if cmp != Ordering::Equal {
                        return cmp;
                    }
                }
            }
        }
    }
}

#[cfg(unix)]
fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path)
        .map(|m| m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(not(unix))]
fn is_executable(path: &Path) -> bool {
    path.is_file()
}

/// Escape a string for safe interpolation into a POSIX shell script.
/// Wraps the argument in single quotes and escapes any embedded quotes.
fn shell_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('\'');
    for ch in s.chars() {
        if ch == '\'' {
            out.push_str("'\\''");
        } else {
            out.push(ch);
        }
    }
    out.push('\'');
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_escape_simple() {
        assert_eq!(shell_escape("claude"), "'claude'");
    }

    #[test]
    fn shell_escape_with_quote() {
        assert_eq!(shell_escape("a'b"), "'a'\\''b'");
    }

    #[test]
    fn human_sort_descends_version_like() {
        let mut v = vec!["v8.17.0", "v22.1.0", "v22.0.9"];
        v.sort_by(|a, b| human_sort_cmp(b, a));
        assert_eq!(v, vec!["v22.1.0", "v22.0.9", "v8.17.0"]);
    }

    #[test]
    fn locate_via_login_shell_finds_sh() {
        // `/bin/sh` should always resolve via the login shell on any POSIX
        // system, including CI. We can't assume `claude` is installed.
        let resolved = locate_via_login_shell("sh");
        assert!(
            resolved.is_some(),
            "login shell should resolve 'sh', got None"
        );
    }

    #[test]
    fn find_in_common_paths_returns_none_for_gibberish() {
        assert!(find_in_common_paths("this-binary-definitely-does-not-exist-xyz123").is_none());
    }
}
