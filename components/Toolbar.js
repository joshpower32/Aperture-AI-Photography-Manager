"use client";

import { useEffect, useRef, useState } from "react";
import { useDam } from "./DamProvider";
import { Icon } from "./icons";
import { UploadButton } from "./UploadControls";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "quality", label: "Best quality" },
];

export default function Toolbar({ sort, onSort, tagFilter, onTagFilter, topTags }) {
  const { runSearch, query, searching, modelsReady } = useDam();
  const [text, setText] = useState(query);
  const timer = useRef(null);

  // Debounce so we don't re-embed the query on every keystroke.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(text), 350);
    return () => clearTimeout(timer.current);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchActive = query.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Semantic search */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-accent">
            {searching ? (
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-line-hi border-t-accent" />
            ) : (
              <Icon.Sparkles width={18} height={18} />
            )}
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Search by meaning — e.g. "red car at sunset with dramatic lighting"'
            className="w-full rounded-lg border border-line bg-card py-3 pl-11 pr-10 text-sm text-cream outline-none transition focus:border-accent"
          />
          {text && (
            <button
              onClick={() => setText("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition hover:text-cream"
              aria-label="Clear search"
            >
              <Icon.Close width={16} height={16} />
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          disabled={searchActive}
          title={searchActive ? "Sorted by search relevance" : "Sort photos"}
          className="rounded-lg border border-line bg-card px-3 py-3 text-sm text-cream outline-none focus:border-accent disabled:opacity-50"
        >
          {searchActive ? (
            <option>By relevance</option>
          ) : (
            SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))
          )}
        </select>

        <UploadButton />
      </div>

      {/* Hint + tag filters */}
      {!modelsReady && !searchActive && (
        <p className="text-xs text-faint">
          Tip: semantic search and tags activate once the AI has analyzed your first photo.
        </p>
      )}

      {topTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-faint">Filter</span>
          {topTags.map((t) => {
            const active = tagFilter === t.tag;
            return (
              <button
                key={t.tag}
                onClick={() => onTagFilter(active ? null : t.tag)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-accent text-bg"
                    : "bg-card text-muted ring-1 ring-line hover:text-cream"
                }`}
              >
                {t.tag} <span className="opacity-60">{t.count}</span>
              </button>
            );
          })}
          {tagFilter && (
            <button
              onClick={() => onTagFilter(null)}
              className="text-xs text-faint underline-offset-2 hover:text-cream hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
