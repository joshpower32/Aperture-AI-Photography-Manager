"use client";

import { useEffect, useMemo, useState } from "react";
import { useDam } from "./DamProvider";
import { estimateUsage } from "@/lib/db";
import { prettyBytes } from "@/lib/image";
import CatalogSidebar from "./CatalogSidebar";
import Toolbar from "./Toolbar";
import PhotoCard from "./PhotoCard";
import Lightbox from "./Lightbox";
import { UploadDropzone } from "./UploadControls";
import { Icon } from "./icons";

const SEARCH_THRESHOLD = 0.19; // CLIP cosine cut-off for "relevant enough"

export default function Workspace() {
  const { photos, catalogs, loaded, query, scores, deletePhoto, confirm } = useDam();
  const [catalog, setCatalog] = useState("all");
  const [sort, setSort] = useState("newest");
  const [tagFilter, setTagFilter] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    estimateUsage().then(setUsage).catch(() => {});
  }, [photos.length]);

  // Photos scoped to the selected catalog (before tag/search filtering).
  const scoped = useMemo(() => {
    if (catalog === "all") return photos;
    if (catalog === "uncat") return photos.filter((p) => !p.catalogId);
    return photos.filter((p) => p.catalogId === catalog);
  }, [photos, catalog]);

  // Tag chips drawn from the scoped set.
  const topTags = useMemo(() => {
    const m = new Map();
    for (const p of scoped) for (const t of p.tags || []) m.set(t.tag, (m.get(t.tag) || 0) + 1);
    return [...m.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [scoped]);

  // Apply tag filter + search ranking + sort.
  const visible = useMemo(() => {
    let list = tagFilter ? scoped.filter((p) => (p.tags || []).some((t) => t.tag === tagFilter)) : scoped;
    const q = query.trim().toLowerCase();

    if (q) {
      if (scores) {
        // Semantic ranking by CLIP cosine similarity.
        list = list
          .map((p) => ({ ...p, _rel: scores.get(p.id) ?? -1 }))
          .filter((p) => p._rel >= SEARCH_THRESHOLD)
          .sort((a, b) => b._rel - a._rel);
      } else {
        // Keyword fallback (AI not ready / failed).
        list = list.filter((p) => {
          const hay = `${p.name} ${p.caption || ""} ${(p.tags || []).map((t) => t.tag).join(" ")}`.toLowerCase();
          return hay.includes(q);
        });
      }
      return list;
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "oldest") return a.createdAt - b.createdAt;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "quality") return (b.quality?.score || 0) - (a.quality?.score || 0);
      return b.createdAt - a.createdAt; // newest
    });
    return sorted;
  }, [scoped, tagFilter, query, scores, sort]);

  const handleDelete = async (photo) => {
    const ok = await confirm({
      title: "Delete this photo?",
      body: `“${photo.name}” will be permanently removed from your local library.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) deletePhoto(photo.id);
  };

  const open = (photo) => {
    const idx = visible.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setOpenIndex(idx);
  };

  // Keep the lightbox index valid as the underlying list changes.
  const current = openIndex != null && openIndex < visible.length ? visible[openIndex] : null;
  useEffect(() => {
    if (openIndex != null && openIndex >= visible.length) setOpenIndex(null);
  }, [visible.length, openIndex]);

  const searchActive = query.trim().length > 0;

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      {/* Hero band */}
      <section
        className="relative mt-6 overflow-hidden rounded-2xl border border-line px-6 py-8 sm:px-10 sm:py-10"
        style={{ background: "linear-gradient(135deg, var(--color-card), var(--color-bg-soft))" }}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <p className="tracked text-accent">Digital Asset Manager</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl leading-tight text-cream sm:text-4xl">
          Your photo library, understood by AI.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Upload your shots — they're captioned, tagged and scored on-device, then searchable in
          plain English. Everything stays in your browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm text-muted">
          <Stat n={photos.length} label="Photos" />
          <Stat n={catalogs.length} label="Catalogs" />
          {usage?.usage ? <Stat n={prettyBytes(usage.usage)} label="Stored" raw /> : null}
        </div>
      </section>

      {!loaded ? (
        <Centered>
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-line-hi border-t-accent" />
          <p className="mt-3 text-sm text-muted">Opening your library…</p>
        </Centered>
      ) : photos.length === 0 ? (
        <div className="mt-8">
          <UploadDropzone />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 pb-16 md:grid-cols-[210px_1fr]">
          <div className="md:sticky md:top-24 md:self-start">
            <CatalogSidebar selected={catalog} onSelect={setCatalog} />
          </div>

          <div className="min-w-0">
            <Toolbar
              sort={sort}
              onSort={setSort}
              tagFilter={tagFilter}
              onTagFilter={setTagFilter}
              topTags={topTags}
            />

            <div className="mt-5 flex items-baseline justify-between">
              <p className="text-sm text-muted">
                {searchActive ? (
                  <>
                    <span className="text-cream">{visible.length}</span> result
                    {visible.length === 1 ? "" : "s"} for “{query.trim()}”
                  </>
                ) : (
                  <>
                    <span className="text-cream">{visible.length}</span> photo
                    {visible.length === 1 ? "" : "s"}
                  </>
                )}
              </p>
            </div>

            {visible.length === 0 ? (
              <EmptyResults searchActive={searchActive} />
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((p) => (
                  <PhotoCard
                    key={p.id}
                    photo={p}
                    relevance={searchActive && scores ? p._rel : undefined}
                    onOpen={open}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {current && (
        <Lightbox
          photo={current}
          hasPrev={openIndex > 0}
          hasNext={openIndex < visible.length - 1}
          onPrev={() => setOpenIndex((i) => Math.max(0, i - 1))}
          onNext={() => setOpenIndex((i) => Math.min(visible.length - 1, i + 1))}
          onClose={() => setOpenIndex(null)}
        />
      )}

      <footer className="border-t border-line py-8 text-center text-xs text-faint">
        Aperture · AI Photography Asset Manager · built by Joshua Power · all processing is on-device
      </footer>
    </div>
  );
}

function Stat({ n, label, raw }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-display text-xl text-cream">{raw ? n : n}</span>
      <span className="text-xs uppercase tracking-wider text-faint">{label}</span>
    </span>
  );
}

function Centered({ children }) {
  return <div className="flex flex-col items-center justify-center py-32 text-center">{children}</div>;
}

function EmptyResults({ searchActive }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-line-hi bg-card/40 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-faint">
        <Icon.Search width={22} height={22} />
      </span>
      <h3 className="mt-4 font-display text-xl text-cream">
        {searchActive ? "No strong matches" : "Nothing here yet"}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted">
        {searchActive
          ? "Try describing the scene differently, or clear the search."
          : "This catalog is empty. Add photos or move some here from the editor."}
      </p>
    </div>
  );
}
