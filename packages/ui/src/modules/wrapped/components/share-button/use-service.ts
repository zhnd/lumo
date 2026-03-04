import { useCallback, useState } from "react";
import type { ShareButtonProps, ActionState } from "./types";
import { capture, saveToDesktop, copyToClipboard } from "./libs";

export function useService({ targetRef }: ShareButtonProps) {
  const [saveState, setSaveState] = useState<ActionState>("idle");
  const [copyState, setCopyState] = useState<ActionState>("idle");

  const handleSave = useCallback(async () => {
    if (!targetRef.current || saveState === "working") return;

    setSaveState("working");
    try {
      const canvas = await capture(targetRef.current);
      await saveToDesktop(canvas);
      setSaveState("done");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      console.error("Failed to save image:", err);
      setSaveState("idle");
    }
  }, [targetRef, saveState]);

  const handleCopy = useCallback(async () => {
    if (!targetRef.current || copyState === "working") return;

    setCopyState("working");
    try {
      const canvas = await capture(targetRef.current);
      await copyToClipboard(canvas);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
      setCopyState("idle");
    }
  }, [targetRef, copyState]);

  return { saveState, copyState, handleSave, handleCopy };
}
