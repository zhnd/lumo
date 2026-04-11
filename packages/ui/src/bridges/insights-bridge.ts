import { invoke } from "@tauri-apps/api/core";
import type { InsightsReport } from "../generated/typeshare-types";

export class InsightsBridge {
  static listReports = () => invoke<InsightsReport[]>("list_insights_reports");
  static generate = () => invoke<string>("generate_insights_report");
  static readReport = (path: string) =>
    invoke<string>("read_insights_report", { path });
}
