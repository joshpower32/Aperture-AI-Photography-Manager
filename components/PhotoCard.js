"use client";

import { useState } from "react";
import { useDam } from "./DamProvider";
import { Icon } from "./icons";
import QualityBadge from "./QualityBadge";

export default function PhotoCard({ photo, relevance, onOpen, onDelete }) {
  const { reprocessPhoto } = useDam();
  const [menu, setMenu] = useState(false);
  const busy = photo.aiStatus === "pending" || photo.aiStatus === "processing";
  const failed = photo.aiStatus === "error";
  const tags = (photo.tags || []).slice(0, 3);

  return (
    <div className="group animate-rise relative overflow-hidden rounded-xl border border-line bg-card transition hover:-translate-y-1 hover:border-accent/50">
      {/* Thumbnail */}
      <button
        onClick={() => onOpen(photo)}
        className="relative block w-full overflow-hidden"
        style={{ aspectRatio: "4 / 3" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumb}
          alt={photo.caption || photo.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/70 backdrop-blur-sm">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-line-hi border-t-accent" />
            <span className="text-[11px] uppercase tracking-wider text-accent-hi">Analyzing</span>
          </div>
        )}

        {/* top badges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {!busy && <QualityBadge quality={photo.quality} />}
          {typeof relevance === "number" && (
            <span className="ml-auto rounded-full bg-bg/80 px-2 py-0.5 text-[11px] font-semibold text-accent-hi ring-1 ring-accent/40">
              {Math.round(relevance * 100)}% match
            </span>
          )}
        </div>
      </button>

      {/* Kebab menu */}
      <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => setMenu((m) => !m)}
          className="grid h-7 w-7 place-items-center rounded-md bg-bg/80 text-cream ring-1 ring-line-hi hover:text-accent"
          aria-label="Photo actions"
        >
          <Icon.Kebab width={16} height={16} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-line bg-card-hi py-1 text-sm shadow-xl">
              <MenuItem onClick={() => { setMenu(false); onOpen(photo); }}>
                <Icon.Edit width={15} height={15} /> Open & edit
              </MenuItem>
              <MenuItem onClick={() => { setMenu(false); reprocessPhoto(photo.id); }}>
                <Icon.Refresh width={15} height={15} /> Re-analyze
              </MenuItem>
              <MenuItem danger onClick={() => { setMenu(false); onDelete(photo); }}>
                <Icon.Trash width={15} height={15} /> Delete
              </MenuItem>
            </div>
          </>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-medium text-cream" title={photo.name}>
          {photo.name}
        </p>
        {failed ? (
          <p className="text-[11px] text-danger">AI analysis failed — re-analyze from the menu.</p>
        ) : tags.length ? (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t.tag}
                className="rounded-full bg-bg-soft px-2 py-0.5 text-[10px] text-muted ring-1 ring-line"
              >
                {t.tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-faint">{busy ? "Tagging…" : "No tags yet"}</p>
        )}
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-bg/60 ${
        danger ? "text-danger" : "text-cream"
      }`}
    >
      {children}
    </button>
  );
}
