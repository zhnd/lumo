import { invoke } from "@tauri-apps/api/core";
import type {
  SkillSummary,
  SkillDetail,
  SkillCommandResult,
  CodexSkillSummary,
} from "../generated/typeshare-types";

/**
 * Skills Bridge - Frontend interface for Claude Skills management
 */
export class SkillsBridge {
  static async listSkills(): Promise<SkillSummary[]> {
    return invoke<SkillSummary[]>("list_skills");
  }

  static async getSkillDetail(name: string): Promise<SkillDetail> {
    return invoke<SkillDetail>("get_skill_detail", { name });
  }

  static async updateSkill(
    name: string,
    content: string,
  ): Promise<SkillCommandResult> {
    return invoke<SkillCommandResult>("update_skill", { name, content });
  }

  static async installSkill(name: string): Promise<SkillCommandResult> {
    return invoke<SkillCommandResult>("install_skill", { name });
  }

  static async installSkillFromSource(
    source: string,
    isLocal: boolean,
  ): Promise<SkillCommandResult> {
    return invoke<SkillCommandResult>("install_skill_from_source", {
      source,
      isLocal,
    });
  }

  static async listCodexSkills(): Promise<CodexSkillSummary[]> {
    return invoke<CodexSkillSummary[]>("list_codex_skills");
  }

  static async uninstallSkill(path: string): Promise<SkillCommandResult> {
    return invoke<SkillCommandResult>("uninstall_skill", { path });
  }

  static async enableSkill(name: string): Promise<SkillCommandResult> {
    return invoke<SkillCommandResult>("enable_skill", { name });
  }

  static async disableSkill(name: string): Promise<SkillCommandResult> {
    return invoke<SkillCommandResult>("disable_skill", { name });
  }
}
