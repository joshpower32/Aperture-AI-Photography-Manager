"use client";

import { useMemo, useState } from "react";
import { useDam } from "./DamProvider";
import { Icon } from "./icons";

export default function CatalogSidebar({ selected, onSelect }) {
  const { photos, catalogs, createCatalog, renameCatalog, deleteCatalog, confirm, toast } =
    useDam();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const counts = useMemo(() => {
    const m = { all: photos.length, uncat: 0 };
    for (const p of photos) {
      if (p.catalogId) m[p.catalogId] = (m[p.catalogId] || 0) + 1;
      else m.uncat += 1;
    }
    return m;
  }, [photos]);

  const submitNew = async () => {
    const name = newName.trim();
    if (!name) return setAdding(false);
    const cat = await createCatalog(name);
    setNewName("");
    setAdding(false);
    if (cat) {
      onSelect(cat.id);
      toast(`Catalog “${cat.name}” created.`);
    }
  };

  const submitRename = async (id) => {
    if (editName.trim()) await renameCatalog(id, editName);
    setEditingId(null);
  };

  const handleDelete = async (cat) => {
    const ok = await confirm({
      title: `Delete “${cat.name}”?`,
      body: "The catalog is removed. Photos inside it become uncatalogued — they are not deleted.",
      confirmLabel: "Delete catalog",
      danger: true,
    });
    if (ok) {
      await deleteCatalog(cat.id);
      if (selected === cat.id) onSelect("all");
      toast("Catalog deleted.");
    }
  };

  return (
    <aside className="flex flex-col gap-1">
      <h2 className="px-2 pb-2 text-[11px] uppercase tracking-[0.18em] text-faint">Library</h2>

      <Row
        active={selected === "all"}
        onClick={() => onSelect("all")}
        icon={<Icon.Images width={16} height={16} />}
        label="All photos"
        count={counts.all}
      />
      <Row
        active={selected === "uncat"}
        onClick={() => onSelect("uncat")}
        icon={<Icon.Folder width={16} height={16} />}
        label="Uncatalogued"
        count={counts.uncat}
      />

      <div className="mt-4 flex items-center justify-between px-2 pb-1">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-faint">Catalogs</h2>
        <button
          onClick={() => {
            setAdding(true);
            setNewName("");
          }}
          className="text-muted transition hover:text-accent"
          aria-label="New catalog"
        >
          <Icon.Plus width={16} height={16} />
        </button>
      </div>

      {catalogs.map((c) => (
        <div key={c.id} className="group relative">
          {editingId === c.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => submitRename(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename(c.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full rounded-md border border-accent bg-card px-3 py-2 text-sm text-cream outline-none"
            />
          ) : (
            <Row
              active={selected === c.id}
              onClick={() => onSelect(c.id)}
              icon={<Icon.Folder width={16} height={16} />}
              label={c.name}
              count={counts[c.id] || 0}
              actions={
                <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <IconBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    label="Rename"
                  >
                    <Icon.Edit width={13} height={13} />
                  </IconBtn>
                  <IconBtn
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c);
                    }}
                    label="Delete"
                  >
                    <Icon.Trash width={13} height={13} />
                  </IconBtn>
                </span>
              }
            />
          )}
        </div>
      ))}

      {adding && (
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={submitNew}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNew();
            if (e.key === "Escape") setAdding(false);
          }}
          placeholder="Catalog name…"
          className="w-full rounded-md border border-accent bg-card px-3 py-2 text-sm text-cream outline-none"
        />
      )}

      {!catalogs.length && !adding && (
        <p className="px-2 py-1 text-xs leading-relaxed text-faint">
          No catalogs yet. Create one to group shoots, clients or projects.
        </p>
      )}
    </aside>
  );
}

function Row({ active, onClick, icon, label, count, actions }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
        active ? "bg-accent/15 text-accent-hi ring-1 ring-accent/30" : "text-cream hover:bg-card"
      }`}
    >
      <span className={active ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="flex-1 truncate text-left">{label}</span>
      {actions}
      <span className="tabular-nums text-xs text-faint">{count}</span>
    </button>
  );
}

function IconBtn({ children, onClick, label, danger }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      aria-label={label}
      className={`grid h-6 w-6 place-items-center rounded transition hover:bg-bg/60 ${
        danger ? "text-faint hover:text-danger" : "text-faint hover:text-accent"
      }`}
    >
      {children}
    </span>
  );
}
