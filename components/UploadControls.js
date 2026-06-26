"use client";

import { useRef, useState } from "react";
import { useDam } from "./DamProvider";
import { Icon } from "./icons";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/x-canon-cr2,.cr2,video/mp4,video/webm,video/quicktime";

// Compact button for the toolbar.
export function UploadButton() {
  const { addFiles } = useDam();
  const inputRef = useRef(null);
  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="tracked flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-bg transition hover:bg-accent-hi"
      >
        <Icon.Upload width={16} height={16} strokeWidth={2.2} />
        Add photos
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

// Large drag-and-drop zone for the empty state.
export function UploadDropzone() {
  const { addFiles } = useDam();
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-20 text-center transition ${
        over ? "border-accent bg-accent/5" : "border-line-hi bg-card/40 hover:border-accent/50"
      }`}
    >
      <span className="grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent">
        <Icon.Upload width={28} height={28} strokeWidth={2} />
      </span>
      <h3 className="mt-5 font-display text-2xl text-cream">Drop photos or videos to begin</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Drag images (JPEG, PNG, WebP, AVIF), RAW (CR2) or videos (MP4, WebM, MOV) here, or click
        to browse. Each one is captioned, tagged and scored by AI right here in your browser —
        nothing is uploaded.
      </p>
      <span className="tracked mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-bg">
        <Icon.Upload width={16} height={16} strokeWidth={2.2} />
        Choose files
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
