// =====================================================================
//  worker.js — all heavy AI runs here, off the main thread.
//
//  • CLIP (vision + text) produces embeddings that live in one shared
//    space, which powers BOTH auto-tagging and natural-language search.
//  • ViT-GPT2 produces a descriptive caption.
//
//  Models load lazily on first use and are cached by the browser after
//  the first download. Messages are correlated by `id` so the main thread
//  can await each job.
// =====================================================================

import {
  env,
  pipeline,
  AutoProcessor,
  AutoTokenizer,
  CLIPVisionModelWithProjection,
  CLIPTextModelWithProjection,
  RawImage,
} from "@huggingface/transformers";

import { normalize, dot } from "../cosine.js";
import { TAG_VOCAB, displayTag } from "./labels.js";

// Always pull weights from the Hugging Face CDN; cache them in the browser.
env.allowLocalModels = false;

const CLIP_ID = "Xenova/clip-vit-base-patch32";
const CAPTION_ID = "Xenova/vit-gpt2-image-captioning";

const post = (msg) => self.postMessage(msg);
const progress = (data) => post({ type: "progress", data });

// Try a quantised load first (small + fast); fall back to default precision
// if a particular model has no quantised export.
async function loadWithFallback(loader) {
  try {
    return await loader({ dtype: "q8", device: "wasm", progress_callback: progress });
  } catch (e) {
    console.warn("[worker] q8 load failed, retrying at default precision", e);
    return await loader({ device: "wasm", progress_callback: progress });
  }
}

// --- lazy singletons -------------------------------------------------
let _visionModel, _processor, _textModel, _tokenizer, _captioner;
let _labelVectors = null; // [{ tag, vec }]

async function vision() {
  if (!_visionModel) {
    post({ type: "status", stage: "vision", message: "Loading CLIP vision model…" });
    _processor = await AutoProcessor.from_pretrained(CLIP_ID);
    _visionModel = await loadWithFallback((opts) =>
      CLIPVisionModelWithProjection.from_pretrained(CLIP_ID, opts)
    );
  }
  return { model: _visionModel, processor: _processor };
}

async function text() {
  if (!_textModel) {
    post({ type: "status", stage: "text", message: "Loading CLIP text model…" });
    _tokenizer = await AutoTokenizer.from_pretrained(CLIP_ID);
    _textModel = await loadWithFallback((opts) =>
      CLIPTextModelWithProjection.from_pretrained(CLIP_ID, opts)
    );
  }
  return { model: _textModel, tokenizer: _tokenizer };
}

async function captioner() {
  if (!_captioner) {
    post({ type: "status", stage: "caption", message: "Loading caption model…" });
    _captioner = await loadWithFallback((opts) =>
      pipeline("image-to-text", CAPTION_ID, opts)
    );
  }
  return _captioner;
}

// Encode an arbitrary list of strings → array of normalised vectors.
async function embedTexts(strings) {
  const { model, tokenizer } = await text();
  const inputs = tokenizer(strings, { padding: true, truncation: true });
  const { text_embeds } = await model(inputs);
  const dim = text_embeds.dims.at(-1);
  const flat = text_embeds.data;
  const out = [];
  for (let i = 0; i < strings.length; i++) {
    out.push(normalize(Array.from(flat.slice(i * dim, (i + 1) * dim))));
  }
  return out;
}

async function labelVectors() {
  if (_labelVectors) return _labelVectors;
  post({ type: "status", stage: "labels", message: "Indexing tag vocabulary…" });
  const prompts = TAG_VOCAB.map((t) => `a photo of ${t}`);
  const vecs = await embedTexts(prompts);
  _labelVectors = TAG_VOCAB.map((tag, i) => ({ tag, vec: vecs[i] }));
  return _labelVectors;
}

// Embed a single image → normalised vector.
async function embedImage(image) {
  const { model, processor } = await vision();
  const inputs = await processor(image);
  const { image_embeds } = await model(inputs);
  return normalize(Array.from(image_embeds.data));
}

// Pick the top tags for an image embedding via cosine similarity.
function tagsFor(imgVec, labels, topK = 6, minScore = 0.2) {
  const scored = labels
    .map((l) => ({ tag: displayTag(l.tag), score: dot(imgVec, l.vec) }))
    .sort((a, b) => b.score - a.score);
  // Keep the strongest matches; always return at least the top 3 so a photo
  // is never left untagged, but drop weak tails below the threshold.
  const out = [];
  for (let i = 0; i < scored.length && out.length < topK; i++) {
    if (i < 3 || scored[i].score >= minScore) out.push(scored[i]);
  }
  return out.map((s) => ({ tag: s.tag, score: Math.round(s.score * 1000) / 1000 }));
}

// --- main handler ----------------------------------------------------
self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  try {
    if (type === "warmup") {
      await Promise.all([labelVectors(), captioner()]);
      post({ id, type: "result", result: { ok: true } });
      return;
    }

    if (type === "process") {
      const image = await RawImage.fromBlob(payload.blob);

      // Caption + embedding can be derived from the same decoded image.
      post({ type: "status", stage: "caption", message: "Writing caption…" });
      const capOut = await (await captioner())(image, { max_new_tokens: 28 });
      const caption = (Array.isArray(capOut) ? capOut[0]?.generated_text : capOut?.generated_text || "")
        .trim()
        .replace(/\s+/g, " ");

      post({ type: "status", stage: "embed", message: "Understanding the image…" });
      const embedding = await embedImage(image);
      const labels = await labelVectors();
      const tags = tagsFor(embedding, labels);

      post({
        id,
        type: "result",
        result: {
          caption: caption ? caption[0].toUpperCase() + caption.slice(1) : "",
          embedding,
          tags,
        },
      });
      return;
    }

    if (type === "embedText") {
      const [vec] = await embedTexts([payload.text]);
      post({ id, type: "result", result: { embedding: vec } });
      return;
    }

    post({ id, type: "error", error: `Unknown job type: ${type}` });
  } catch (err) {
    console.error("[worker] job failed", err);
    post({ id, type: "error", error: err?.message || String(err) });
  }
};
