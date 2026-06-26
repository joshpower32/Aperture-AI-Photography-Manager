# Aperture — AI Photography Asset Manager

A private, in-browser **Digital Asset Manager (DAM)** for photographers. Drop in your
photos and they're automatically **captioned, tagged, and quality-scored** by AI — then
searchable in plain English ("a red car at sunset with dramatic lighting"). You can
**rename, sort, and catalog** everything into collections.

Everything runs **on-device**: the AI models execute in your browser via
[Transformers.js](https://huggingface.co/docs/transformers.js), and your photos are stored
locally in **IndexedDB**. No server, no API keys, no uploads — your images never leave your
machine.

## Features

- **Upload & store** — drag-and-drop JPEG / PNG / WebP / AVIF; full-resolution blobs and
  metadata persist locally in IndexedDB.
- **AI auto-captioning** — a descriptive sentence per photo (ViT-GPT2).
- **AI auto-tagging** — zero-shot tags from a curated vocabulary using CLIP image/text
  embeddings.
- **Composition / quality score** — a transparent, explainable heuristic (sharpness +
  exposure + contrast), shown with a per-metric breakdown.
- **Natural-language search** — CLIP text embeddings ranked against image embeddings by
  cosine similarity, with a live relevance score.
- **Catalogs** — group photos into named collections (shoots, clients, projects).
- **Rename, edit & sort** — edit names, captions and tags; sort by date, name or quality;
  filter by tag.

## Tech stack

- **Next.js (App Router)** + **React 19**
- **Tailwind CSS v4** (design tokens port the dark + gold "Joe's Photography" look)
- **@huggingface/transformers** — `Xenova/clip-vit-base-patch32` (search + tags) and
  `Xenova/vit-gpt2-image-captioning` (captions), run in a **Web Worker**
- **IndexedDB** for local persistence

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first photo you add triggers a one-time model download
(cached by the browser afterward); the AI status pill in the header shows progress.

## How it works

```
Upload ─▶ decode + thumbnail + quality heuristic (main thread, lib/image.js)
       └▶ queued ─▶ Web Worker (lib/ai/worker.js)
                    ├─ ViT-GPT2  → caption
                    └─ CLIP      → image embedding ─▶ tags (cosine vs label vocab)
                                                   └▶ stored for semantic search

Search ─▶ CLIP text embedding ─▶ cosine similarity vs every image embedding ─▶ ranked
```

All embeddings and metadata live in IndexedDB (`lib/db.js`), so the library — and search —
work offline once the models are cached.

## Project structure

```
app/            Next.js routes, layout, global Tailwind theme
components/      UI: provider/state, navbar, toolbar, grid, cards, lightbox, sidebar
lib/
  db.js          IndexedDB wrapper (photos + catalogs)
  image.js       decode, thumbnail, composition/quality scoring
  cosine.js      vector helpers
  ai/
    worker.js    Transformers.js models (runs off the main thread)
    aiClient.js  promise-based bridge to the worker
    labels.js    zero-shot tag vocabulary
```

---

## Coming from plain HTML/CSS/JS? (a beginner's map)

If your previous projects were a single `index.html`, `style.css`, and `app.js`, this layout
looks unfamiliar. Here's how it maps onto what you already know — keep this section as a
reference.

### The one big mental shift

Before, you **double-clicked `index.html`** and the browser ran your files directly.

Here, you don't open any file in the browser. You run a **dev server**:

```bash
npm run dev      # then open http://localhost:3000
```

That command reads all these files, assembles them, and serves a finished website. You edit a
file → save → the browser auto-refreshes. The `.js` files are *ingredients*; the server is the
chef that turns them into the finished page. You never open the ingredients directly.

### Your 3 files → these files

Everything you knew still exists — it's just split into smaller pieces connected with
`import` / `export` instead of multiple `<script>` and `<link>` tags.

| Your old file | Where it lives here | Why |
|---|---|---|
| **`index.html`** (page structure) | `app/layout.js` (the `<html><body>` shell) · `app/page.js` (the home page) · everything in `components/` (reusable chunks) | HTML is written as **JSX** inside components and *generated* for you |
| **`style.css`** (styling) | `app/globals.css` (colors/fonts/theme) · plus `className="..."` written in the markup | Most styling is **Tailwind** utility classes inline; `globals.css` only holds the shared theme |
| **`app.js`** (behavior) | Every `.js` file in `components/` and `lib/` | Logic is split into many small files that `import` each other |

### The files with no old equivalent (setup — you rarely touch these)

- **`package.json`** — the recipe card: which libraries the project uses + commands like `npm run dev`.
- **`node_modules/`** — the downloaded library code. Auto-created by `npm install`. **Never edit; never commit.**
- **`next.config.mjs`, `postcss.config.mjs`, `jsconfig.json`** — tool settings. Set up once; ignore.
- **`.gitignore`** — tells Git which files to skip.
- **`app/`** — a *special* Next.js folder: a `page.js` here automatically becomes a web page.
- **`components/`** (visible UI pieces) and **`lib/`** (behind-the-scenes logic) — just organization.

### File extensions, quickly

- **`.js`** — JavaScript (same language as `app.js`). In `components/` these return HTML-like markup (a **React component**); in `lib/` they're plain logic.
- **`.mjs`** — a `.js` file that uses modern `import`/`export`. Only used for config here.
- **`.json`** — pure data/settings, no logic.
- **`.css`** — same as before, with a couple of Tailwind keywords at the top.

### The same button, both ways

Old way — three separate files:

```html
<!-- index.html -->   <button class="btn" id="go">Search</button>
```
```css
/* style.css */       .btn { background: gold; color: black; }
```
```js
/* app.js */          document.getElementById('go').addEventListener('click', doSearch);
```

This project — all in one component:

```jsx
function SearchButton() {
  function doSearch() { /* ... */ }
  return (
    <button className="bg-accent text-bg" onClick={doSearch}>
      Search
    </button>
  );
}
```

Structure (HTML), style (`bg-accent text-bg` = your CSS), and behavior (`onClick`) all live
together, and the button is reusable anywhere via `<SearchButton />`. Two gotchas: in JSX it's
**`className`** (not `class`) and **`onClick`** (camelCase, not `onclick`).

### Which file do I edit to change X?

- **Headline / hero / page layout** → `components/Workspace.js`
- **Colors, fonts, the gold accent** → `app/globals.css` (the `@theme` block at top)
- **Top nav bar** → `components/Navbar.js`
- **How each photo card looks** → `components/PhotoCard.js`
- **The AI tag list** → `lib/ai/labels.js`
- **Add a new library** → run `npm install <name>` (it updates `package.json` for you)

### Day-to-day workflow

1. `npm run dev` once (leave it running in the terminal).
2. Open `http://localhost:3000`.
3. Edit a file, hit save → the browser refreshes automatically.
4. `Ctrl+C` in the terminal stops the server.

You'll spend most of your time in `components/` and `globals.css`; the rest is set-and-forget
plumbing.

---

Built by Joshua Power.
