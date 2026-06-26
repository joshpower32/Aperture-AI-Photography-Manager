"use client";

import { useEffect, useRef, useState } from "react";
import { useDam } from "./DamProvider";
import { Icon } from "./icons";
import QualityBadge, { qualityColor } from "./QualityBadge";
import { prettyBytes } from "@/lib/image";

const fmtDate = (ts) =>
  new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Lightbox({ photo, hasPrev, hasNext, onPrev, onNext, onClose }) {
  const { catalogs, updatePhoto, deletePhoto, reprocessPhoto, getBlob, confirm } = useDam();
  const [url, setUrl] = useState(null);
  const [name, setName] = useState(photo.name);
  const [caption, setCaption] = useState(photo.caption || "");
  const [newTag, setNewTag] = useState("");
  const nameRef = useRef(null);

  // Load the full-resolution blob for this photo and recycle the object URL.
  useEffect(() => {
    let revoked = false;
    let current = null;
    setUrl(null);
    getBlob(photo.id).then((blob) => {
      if (revoked || !blob) return;
      current = URL.createObjectURL(blob);
      setUrl(current);
    });
    return () => {
      revoked = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [photo.id, getBlob]);

  // Keep editable fields in sync when navigating between photos.
  useEffect(() => {
    setName(photo.name);
    setCaption(photo.caption || "");
    setNewTag("");
  }, [photo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.("input, textarea")) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  const commitName = () => {
    const next = name.trim() || photo.name;
    setName(next);
    if (next !== photo.name) updatePhoto(photo.id, { name: next });
  };
  const commitCaption = () => {
    if (caption !== (photo.caption || "")) updatePhoto(photo.id, { caption });
  };

  const tags = photo.tags || [];
  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    if (tags.some((x) => x.tag === t)) {
      setNewTag("");
      return;
    }
    updatePhoto(photo.id, { tags: [...tags, { tag: t, score: null }] });
    setNewTag("");
  };
  const removeTag = (tag) =>
    updatePhoto(photo.id, { tags: tags.filter((x) => x.tag !== tag) });

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this photo?",
      body: `“${photo.name}” will be permanently removed from your local library.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) {
      await deletePhoto(photo.id);
      onClose();
    }
  };

  const busy = photo.aiStatus === "pending" || photo.aiStatus === "processing";

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-bg/95 backdrop-blur-sm md:flex-row"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-card hover:text-accent"
        aria-label="Close"
      >
        <Icon.Close width={22} height={22} />
      </button>

      {/* Image stage */}
      <div
        className="relative flex flex-1 items-center justify-center p-4 md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <NavArrow side="left" onClick={onPrev} />
        )}
        {url ? (
          photo.kind === "video" ? (
            <video
              src={url}
              controls
              playsInline
              autoPlay
              className="max-h-[78vh] max-w-full rounded-lg shadow-2xl"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={caption || name}
              className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          )
        ) : (
          <div className="flex h-64 w-64 items-center justify-center">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-line-hi border-t-accent" />
          </div>
        )}
        {hasNext && <NavArrow side="right" onClick={onNext} />}
      </div>

      {/* Detail / edit panel */}
      <aside
        className="flex w-full flex-col overflow-y-auto border-t border-line bg-bg-soft p-6 md:w-[380px] md:border-l md:border-t-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Name */}
        <label className="text-[11px] uppercase tracking-wider text-muted">Name</label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2 font-display text-lg text-cream outline-none focus:border-accent"
        />

        {/* Quality */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted">Composition</span>
          <QualityBadge quality={photo.quality} withLabel size="lg" />
        </div>
        {photo.quality && (
          <div className="mt-3 space-y-2.5">
            <Meter label="Sharpness" value={photo.quality.sharpness} />
            <Meter label="Exposure" value={photo.quality.exposure} />
            <Meter label="Contrast" value={photo.quality.contrast} />
          </div>
        )}

        {/* Caption */}
        <label className="mt-6 text-[11px] uppercase tracking-wider text-muted">
          AI Caption
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={commitCaption}
          rows={2}
          placeholder={busy ? "Writing caption…" : "No caption — add one."}
          className="mt-1 w-full resize-none rounded-md border border-line bg-card px-3 py-2 text-sm text-cream outline-none focus:border-accent"
        />

        {/* Tags */}
        <label className="mt-6 text-[11px] uppercase tracking-wider text-muted">Tags</label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t.tag}
              className="group flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs text-cream ring-1 ring-line"
              title={t.score != null ? `AI confidence ${(t.score * 100).toFixed(0)}%` : "Added by you"}
            >
              {t.tag}
              <button
                onClick={() => removeTag(t.tag)}
                className="text-faint transition hover:text-danger"
                aria-label={`Remove ${t.tag}`}
              >
                <Icon.Close width={12} height={12} strokeWidth={2.4} />
              </button>
            </span>
          ))}
          {!tags.length && !busy && <span className="text-xs text-faint">No tags</span>}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Add a tag"
            className="flex-1 rounded-md border border-line bg-card px-3 py-1.5 text-sm text-cream outline-none focus:border-accent"
          />
          <button
            onClick={addTag}
            className="rounded-md bg-card px-3 text-cream ring-1 ring-line-hi transition hover:text-accent"
          >
            <Icon.Plus width={16} height={16} />
          </button>
        </div>

        {/* Catalog */}
        <label className="mt-6 text-[11px] uppercase tracking-wider text-muted">Catalog</label>
        <select
          value={photo.catalogId || ""}
          onChange={(e) => updatePhoto(photo.id, { catalogId: e.target.value || null })}
          className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-cream outline-none focus:border-accent"
        >
          <option value="">Uncatalogued</option>
          {catalogs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* File facts */}
        <dl className="mt-6 grid grid-cols-2 gap-y-2 text-xs text-muted">
          <dt>Dimensions</dt>
          <dd className="text-right text-cream">
            {photo.width}×{photo.height}
          </dd>
          <dt>File size</dt>
          <dd className="text-right text-cream">{prettyBytes(photo.size)}</dd>
          <dt>Type</dt>
          <dd className="text-right text-cream">{(photo.type || "").replace("image/", "") || "—"}</dd>
          <dt>Added</dt>
          <dd className="text-right text-cream">{fmtDate(photo.createdAt)}</dd>
        </dl>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-6">
          <button
            onClick={() => reprocessPhoto(photo.id)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-card px-3 py-2.5 text-sm text-cream ring-1 ring-line-hi transition hover:text-accent disabled:opacity-50"
          >
            <Icon.Refresh width={16} height={16} /> Re-analyze
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm text-danger ring-1 ring-danger/30 transition hover:bg-danger/10"
          >
            <Icon.Trash width={16} height={16} /> Delete
          </button>
        </div>
      </aside>
    </div>
  );
}

function NavArrow({ side, onClick }) {
  const Cmp = side === "left" ? Icon.Left : Icon.Right;
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-card/80 text-accent ring-1 ring-accent/30 transition hover:bg-card ${
        side === "left" ? "left-2 md:left-6" : "right-2 md:right-6"
      }`}
      aria-label={side === "left" ? "Previous" : "Next"}
    >
      <Cmp width={24} height={24} />
    </button>
  );
}

function Meter({ label, value }) {
  const c = qualityColor(value);
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 text-muted">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-card">
        <span
          className={`block h-full rounded-full ${c.text}`}
          style={{ width: `${value}%`, backgroundColor: "currentColor" }}
        />
      </span>
      <span className="w-8 text-right tabular-nums text-cream">{value}</span>
    </div>
  );
}
