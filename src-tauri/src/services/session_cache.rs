//! Session detail cache
//!
//! In-memory cache for parsed `ClaudeSessionDetail` to avoid re-parsing
//! unchanged session files on repeated requests.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Instant, SystemTime};

use crate::types::ClaudeSessionDetail;

const TTL_SECONDS: u64 = 600; // 10 minutes
const MAX_ENTRIES: usize = 30;

struct CacheEntry {
    detail: ClaudeSessionDetail,
    mtime: SystemTime,
    size: u64,
    inserted_at: Instant,
}

pub struct SessionDetailCache {
    entries: Mutex<HashMap<String, CacheEntry>>,
}

impl SessionDetailCache {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    /// Get a cached session detail if the file hasn't changed.
    /// Returns `None` on cache miss, stale entry, or expired TTL.
    pub fn get(&self, file_path: &str) -> Option<ClaudeSessionDetail> {
        let meta = std::fs::metadata(file_path).ok()?;
        let mtime = meta.modified().ok()?;
        let size = meta.len();

        let mut entries = self.entries.lock().ok()?;
        let entry = entries.get(file_path)?;

        // Validate mtime + size
        if entry.mtime != mtime || entry.size != size {
            entries.remove(file_path);
            return None;
        }

        // Check TTL
        if entry.inserted_at.elapsed().as_secs() > TTL_SECONDS {
            entries.remove(file_path);
            return None;
        }

        Some(entry.detail.clone())
    }

    /// Store a parsed session detail in the cache.
    pub fn set(&self, file_path: &str, detail: ClaudeSessionDetail) {
        let Ok(file_meta) = std::fs::metadata(file_path) else {
            return;
        };
        let Ok(mtime) = file_meta.modified() else {
            return;
        };
        let size = file_meta.len();

        let Ok(mut entries) = self.entries.lock() else {
            return;
        };

        // Evict oldest entries if at capacity
        while entries.len() >= MAX_ENTRIES {
            let oldest_key = entries
                .iter()
                .min_by_key(|(_, v)| v.inserted_at)
                .map(|(k, _)| k.clone());
            if let Some(key) = oldest_key {
                entries.remove(&key);
            } else {
                break;
            }
        }

        entries.insert(
            file_path.to_string(),
            CacheEntry {
                detail,
                mtime,
                size,
                inserted_at: Instant::now(),
            },
        );
    }

    /// Invalidate a specific cache entry (e.g., when the file changes).
    pub fn invalidate(&self, file_path: &str) {
        if let Ok(mut entries) = self.entries.lock() {
            entries.remove(file_path);
        }
    }
}
