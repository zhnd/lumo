-- Notification settings for per-event-type configuration.
--
-- hook_event values:
--   '*'                              — global default (fallback)
--   'Stop'                           — main Claude finishes responding
--   'SubagentStop'                   — subagent finishes
--   'Notification:permission_prompt' — Claude needs a permission approval
--   'Notification:idle_prompt'       — Claude has been idle, waiting for input
--   'Notification:auth_success'      — authentication succeeded
--   'Notification:*'                 — catch-all for other/future notification types
CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hook_event TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    show_banner INTEGER NOT NULL DEFAULT 1,
    play_sound INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- All events enabled by default.
-- Users who also have terminal notifications can disable duplicates in Lumo Settings.
INSERT OR IGNORE INTO notification_settings (hook_event, enabled, show_banner, play_sound)
VALUES
    ('*',                              1, 1, 1),
    ('Stop',                           1, 1, 1),
    ('SubagentStop',                   1, 1, 1),
    ('Notification:permission_prompt', 1, 1, 1),
    ('Notification:idle_prompt',       1, 1, 1),
    ('Notification:auth_success',      1, 1, 0),
    ('Notification:*',                 1, 1, 1);

-- Add agent_type column to notifications table for SubagentStop events.
ALTER TABLE notifications ADD COLUMN agent_type TEXT;
