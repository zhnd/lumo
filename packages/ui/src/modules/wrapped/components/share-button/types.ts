export interface ShareButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export type ActionState = "idle" | "working" | "done";
