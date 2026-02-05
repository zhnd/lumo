export const UPDATE_STATUS = {
  Idle: "idle",
  Checking: "checking",
  Available: "available",
  Downloading: "downloading",
  ReadyToRelaunch: "ready_to_relaunch",
  Error: "error",
} as const;

export type UpdateStatus = (typeof UPDATE_STATUS)[keyof typeof UPDATE_STATUS];

export interface UpdateProgress {
  contentLength: number | undefined;
  downloaded: number;
}

export interface UpdateInfo {
  version: string;
  date: string | undefined;
  body: string | undefined;
}

export interface UseServiceReturn {
  status: UpdateStatus;
  progress: UpdateProgress;
  updateInfo: UpdateInfo | null;
  downloadPercent: number;
  relaunchApp: () => void;
}
