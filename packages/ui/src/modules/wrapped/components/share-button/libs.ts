import { invoke } from "@tauri-apps/api/core";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";

export async function capture(el: HTMLElement) {
  const { snapdom } = await import("@zumer/snapdom");
  const result = await snapdom(el);
  const canvas = await result.toCanvas({ scale: 2 });
  return canvas;
}

export async function saveToDesktop(canvas: HTMLCanvasElement) {
  const { save } = await import("@tauri-apps/plugin-dialog");

  const timestamp = new Date()
    .toISOString()
    .replace(/[:\-T]/g, "")
    .slice(0, 15);
  const defaultName = `claude-code-wrapped_${timestamp}.png`;

  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "PNG Image", extensions: ["png"] }],
  });

  if (!path) return;

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  await invoke<string>("save_image_to_path", { data: base64, path });
}

export async function copyToClipboard(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });

  const { Image } = await import("@tauri-apps/api/image");
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const image = await Image.fromBytes(buffer);
  await writeImage(image);
}
