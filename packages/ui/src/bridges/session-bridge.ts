import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../generated/typeshare-types";

/**
 * Session Bridge - Frontend interface for session operations
 */
export class SessionBridge {
  /**
   * Get all sessions
   */
  static async getSessions(): Promise<Session[]> {
    return invoke<Session[]>("get_sessions");
  }

  /**
   * Get a session by ID
   */
  static async getSessionById(id: string): Promise<Session> {
    return invoke<Session>("get_session_by_id", { id });
  }
}
