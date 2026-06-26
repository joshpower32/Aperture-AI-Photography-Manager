"use client";

// =====================================================================
//  DamProvider — the single source of truth for the workspace.
//  Owns: the photo library + catalogs (persisted in IndexedDB), the AI
//  worker client, the sequential processing queue, semantic-search state,
//  toasts, and a promise-based confirm dialog.
//
//  Photos are kept in React state WITHOUT their full blob (only the small
//  thumbnail data URL) to keep memory sane; the full blob is read back
//  from IndexedDB on demand when a photo is opened.
// =====================================================================

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { photosDB, catalogsDB } from "@/lib/db";
import { decode, makeThumb, analyzeQuality, decodeVideoFrame, dataUrlToBlob } from "@/lib/image";
import { dot } from "@/lib/cosine";
import { AIClient } from "@/lib/ai/aiClient";

const DamContext = createContext(null);
export const useDam = () => useContext(DamContext);

const stripExt = (name) => name.replace(/\.[^.]+$/, "");
const stripBlob = ({ blob, ...rest }) => rest; // keep state lightweight

export default function DamProvider({ children }) {
  const [photos, setPhotos] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Model / processing status surfaced to the UI.
  const [modelMsg, setModelMsg] = useState("");
  const [modelProgress, setModelProgress] = useState(null); // 0..100 | null
  const [modelsReady, setModelsReady] = useState(false);

  // Search.
  const [query, setQuery] = useState("");
  const [scores, setScores] = useState(null); // Map<id, similarity> | null
  const [searching, setSearching] = useState(false);

  // Toasts + confirm dialog.
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const aiRef = useRef(null);
  const queueRef = useRef([]);
  const runningRef = useRef(false);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // ---------- toasts ----------
  const toast = useCallback((msg, type = "ok") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // ---------- confirm ----------
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    []
  );
  const resolveConfirm = useCallback(
    (val) => {
      setConfirmState((c) => {
        c?.resolve?.(val);
        return null;
      });
    },
    []
  );

  // ---------- boot: load library + spin up the worker ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ps, cs] = await Promise.all([photosDB.getAll(), catalogsDB.getAll()]);
        if (!alive) return;
        setPhotos(ps.map(stripBlob));
        setCatalogs(cs);
      } catch (e) {
        console.error(e);
        toast("Couldn't open the local library.", "err");
      } finally {
        if (alive) setLoaded(true);
      }
    })();

    const client = new AIClient({
      onStatus: ({ message }) => {
        setModelMsg(message || "");
        setModelProgress(null);
      },
      onProgress: (d) => {
        if (d?.status === "progress" && d.total) {
          setModelMsg(`Downloading ${d.file || "model"}`);
          setModelProgress(Math.round((d.loaded / d.total) * 100));
        } else if (d?.status === "ready" || d?.status === "done") {
          setModelProgress(null);
        }
      },
    });
    aiRef.current = client;

    return () => {
      alive = false;
      client.terminate();
    };
  }, [toast]);

  // ---------- state patch helpers ----------
  const patchPhoto = useCallback((id, patch) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  // ---------- processing queue (sequential) ----------
  const processOne = useCallback(
    async (id) => {
      const rec = await photosDB.get(id);
      if (!rec) return;
      patchPhoto(id, { aiStatus: "processing" });
      try {
        // The image model can't read a video file, so for videos we analyze
        // the representative frame we captured (stored as the thumbnail).
        const source = rec.kind === "video" ? await dataUrlToBlob(rec.thumb) : rec.blob;
        const { caption, embedding, tags } = await aiRef.current.process(source);
        const patch = { caption, embedding, tags, aiStatus: "done", aiError: null };
        await photosDB.put({ ...rec, ...patch });
        patchPhoto(id, patch);
        setModelsReady(true);
        setModelMsg("");
      } catch (e) {
        console.error(e);
        const patch = { aiStatus: "error", aiError: e.message };
        await photosDB.put({ ...rec, ...patch });
        patchPhoto(id, patch);
        toast(`AI couldn't analyze “${rec.name}”.`, "err");
      }
    },
    [patchPhoto, toast]
  );

  const pump = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    while (queueRef.current.length) {
      await processOne(queueRef.current.shift());
    }
    runningRef.current = false;
    setModelProgress(null);
    setModelMsg("");
  }, [processOne]);

  // ---------- add photos ----------
  const addFiles = useCallback(
    async (fileList) => {
      const files = [...fileList].filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      if (!files.length) {
        toast("Those files weren't images or videos.", "err");
        return;
      }
      for (const file of files) {
        const id = crypto.randomUUID();
        const isVideo = file.type.startsWith("video/");
        try {
          // Both paths produce a "bitmap" (an ImageBitmap or a canvas) that
          // makeThumb/analyzeQuality can draw from — for video it's a frame.
          let thumb, width, height, quality, duration = null;
          if (isVideo) {
            const frame = await decodeVideoFrame(file);
            width = frame.width;
            height = frame.height;
            duration = frame.duration;
            ({ thumb } = makeThumb(frame.bitmap));
            quality = analyzeQuality(frame.bitmap);
            frame.bitmap.close?.();
          } else {
            const bitmap = await decode(file);
            ({ thumb, width, height } = makeThumb(bitmap));
            quality = analyzeQuality(bitmap);
            bitmap.close?.();
          }
          const photo = {
            id,
            kind: isVideo ? "video" : "image",
            name: stripExt(file.name),
            fileName: file.name,
            type: file.type,
            size: file.size,
            width,
            height,
            duration,
            blob: file,
            thumb,
            caption: "",
            tags: [],
            embedding: null,
            quality,
            catalogId: null,
            createdAt: Date.now(),
            aiStatus: "pending",
          };
          await photosDB.put(photo);
          setPhotos((prev) => [stripBlob(photo), ...prev]);
          queueRef.current.push(id);
        } catch (e) {
          console.error(e);
          toast(`Couldn't read “${file.name}”.`, "err");
        }
      }
      toast(`${files.length} file${files.length > 1 ? "s" : ""} added — analyzing…`);
      pump();
    },
    [pump, toast]
  );

  // ---------- update / rename / delete ----------
  const updatePhoto = useCallback(
    async (id, patch) => {
      const rec = await photosDB.get(id);
      if (!rec) return;
      await photosDB.put({ ...rec, ...patch });
      patchPhoto(id, patch);
    },
    [patchPhoto]
  );

  const deletePhoto = useCallback(
    async (id) => {
      await photosDB.delete(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  const reprocessPhoto = useCallback(
    async (id) => {
      patchPhoto(id, { aiStatus: "pending" });
      queueRef.current.push(id);
      pump();
    },
    [patchPhoto, pump]
  );

  const getBlob = useCallback(async (id) => {
    const rec = await photosDB.get(id);
    return rec?.blob || null;
  }, []);

  // ---------- catalogs ----------
  const createCatalog = useCallback(
    async (name) => {
      const cat = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now() };
      if (!cat.name) return null;
      await catalogsDB.put(cat);
      setCatalogs((prev) => [...prev, cat]);
      return cat;
    },
    []
  );
  const renameCatalog = useCallback(async (id, name) => {
    const next = name.trim();
    if (!next) return;
    setCatalogs((prev) => prev.map((c) => (c.id === id ? { ...c, name: next } : c)));
    const all = await catalogsDB.getAll();
    const cat = all.find((c) => c.id === id);
    if (cat) await catalogsDB.put({ ...cat, name: next });
  }, []);
  const deleteCatalog = useCallback(
    async (id) => {
      await catalogsDB.delete(id);
      setCatalogs((prev) => prev.filter((c) => c.id !== id));
      // Unassign any photos that pointed at it.
      const affected = photosRef.current.filter((p) => p.catalogId === id);
      for (const p of affected) await updatePhoto(p.id, { catalogId: null });
    },
    [updatePhoto]
  );

  // ---------- semantic search ----------
  const runSearch = useCallback(
    async (q) => {
      setQuery(q);
      if (!q.trim()) {
        setScores(null);
        return;
      }
      try {
        setSearching(true);
        const { embedding } = await aiRef.current.embedText(q.trim());
        const map = new Map();
        for (const p of photosRef.current) {
          if (p.embedding) map.set(p.id, dot(embedding, p.embedding));
        }
        setScores(map);
      } catch (e) {
        console.error(e);
        setScores(null); // view falls back to keyword matching
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const processingCount = useMemo(
    () => photos.filter((p) => p.aiStatus === "pending" || p.aiStatus === "processing").length,
    [photos]
  );

  const value = {
    // data
    photos,
    catalogs,
    loaded,
    // status
    modelMsg,
    modelProgress,
    modelsReady,
    processingCount,
    // search
    query,
    scores,
    searching,
    runSearch,
    // photo actions
    addFiles,
    updatePhoto,
    deletePhoto,
    reprocessPhoto,
    getBlob,
    // catalog actions
    createCatalog,
    renameCatalog,
    deleteCatalog,
    // ui
    toast,
    confirm,
  };

  return (
    <DamContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} />
      <ConfirmModal state={confirmState} onResolve={resolveConfirm} />
    </DamContext.Provider>
  );
}

// --- inline UI bits that belong to the provider ----------------------
function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-rise rounded-full px-5 py-2.5 text-sm font-medium shadow-lg ${
            t.type === "err" ? "bg-danger text-white" : "bg-card-hi text-cream ring-1 ring-line-hi"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ state, onResolve }) {
  if (!state) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      onClick={() => onResolve(false)}
    >
      <div
        className="animate-rise w-full max-w-md rounded-xl border border-line bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl text-cream">{state.title}</h3>
        {state.body && <p className="mt-2 text-sm leading-relaxed text-muted">{state.body}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-md px-4 py-2 text-sm text-muted transition hover:text-cream"
            onClick={() => onResolve(false)}
          >
            {state.cancelLabel || "Cancel"}
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              state.danger
                ? "bg-danger text-white hover:brightness-110"
                : "bg-accent text-bg hover:bg-accent-hi"
            }`}
            onClick={() => onResolve(true)}
            autoFocus
          >
            {state.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
