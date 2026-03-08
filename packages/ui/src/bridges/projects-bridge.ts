import { invoke } from "@tauri-apps/api/core";
import type { ClaudeProjectSummary } from "../generated/typeshare-types";

/**
 * Projects Bridge - Frontend interface for Claude Code project discovery
 */
export class ProjectsBridge {
  static async getProjects(): Promise<ClaudeProjectSummary[]> {
    return invoke<ClaudeProjectSummary[]>("get_projects");
  }

  static async getGlobalSkillCount(): Promise<number> {
    return invoke<number>("get_global_skill_count");
  }
}
