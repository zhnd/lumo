export const VIEW_MODE = {
  List: "list",
  Detail: "detail",
  Edit: "edit",
} as const;

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];
