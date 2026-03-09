import { invoke } from "@tauri-apps/api/core";
import type {
  ClaudeSessionDetail,
  ClaudeSessionPage,
} from "../generated/typeshare-types";

/**
 * Claude Session Bridge - Frontend interface for Claude Code session operations
 */
export class ClaudeSessionBridge {
  static async getSessionsPage(
    projectPath: string | null,
    offset: number,
    limit: number,
  ): Promise<ClaudeSessionPage> {
    return invoke<ClaudeSessionPage>("get_claude_sessions_page", {
      projectPath,
      offset,
      limit,
    });
  }

  /**
   * Get Claude Code session detail with messages
   */
  static async getSessionDetail(
    sessionPath: string,
  ): Promise<ClaudeSessionDetail> {
    return invoke<ClaudeSessionDetail>("get_claude_session_detail", {
      sessionPath,
    });
  }
}
