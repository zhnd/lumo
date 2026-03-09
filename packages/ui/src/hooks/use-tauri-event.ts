import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void,
) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listen<T>(eventName, (event) => handler(event.payload)).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [eventName, handler]);
}
