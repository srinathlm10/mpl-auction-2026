"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

interface Props {
  name: string;
  label: string;
  currentUrl?: string | null;
  /** Used for the initials placeholder. */
  fallbackName: string;
}

/** File input with an instant preview of the chosen (or current) image. */
export function ImageField({ name, label, currentUrl, fallbackName }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-border">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected preview" className="h-full w-full object-cover" />
          ) : (
            <PlayerAvatar name={fallbackName || "?"} src={currentUrl ?? null} sizes="96px" className="text-3xl" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            id={name}
            name={name}
            type="file"
            accept="image/*"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <p className="mt-1 text-xs text-muted">JPG, PNG or WebP, up to 5 MB.{currentUrl ? " Leave empty to keep the current image." : ""}</p>
        </div>
      </div>
    </div>
  );
}
