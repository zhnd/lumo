-- Notifications table for Claude Code hook events
-- Stores notifications from hooks (permission prompts, idle, task complete, session end)

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    hook_event TEXT NOT NULL,
    notification_type TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    cwd TEXT,
    transcript_path TEXT,
    notified INTEGER NOT NULL DEFAULT 0,
    read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_notifications_notified ON notifications(notified);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
