"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ImageData } from "../../shared/content-parser";

interface ImageViewerProps {
  images: ImageData[];
  className?: string;
}

export function ImageViewer({ images, className }: ImageViewerProps) {
  if (images.length === 0) return null;

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {images.map((image, index) => (
        <ImageWithFallback
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
        />
      ))}
    </div>
  );
}

function ImageWithFallback({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-medium">Image preview unavailable</p>
        <p className="mt-1 break-all text-[11px]">
          {src.startsWith("data:") ? "data:image/* (inline)" : src}
        </p>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={900}
      unoptimized
      onError={() => setFailed(true)}
      className="h-auto max-h-[360px] w-full rounded-md object-contain"
    />
  );
}
