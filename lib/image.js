// =====================================================================
//  image.js — client-side image handling that does NOT need the AI model:
//  decoding, thumbnailing, and a transparent composition/quality score.
//
//  The quality score is a deliberately explainable heuristic (sharpness +
//  exposure + contrast) computed from pixel data — no black box. Each
//  sub-metric is reported so the UI can show *why* a photo scored as it did.
// =====================================================================

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export async function decode(blob) {
  // createImageBitmap handles JPEG/PNG/WebP/AVIF the browser supports.
  return await createImageBitmap(blob);
}

// Draw the bitmap onto a canvas no larger than `max` on its long edge and
// return a JPEG data URL plus the natural dimensions.
export function makeThumb(bitmap, max = 512, quality = 0.82) {
  const { width, height } = bitmap;
  const scale = Math.min(1, max / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return {
    thumb: canvas.toDataURL("image/jpeg", quality),
    width,
    height,
  };
}

// Pull a small grayscale buffer for analysis (≤ `side` on the long edge).
function grayscaleSample(bitmap, side = 256) {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(2, Math.round(bitmap.width * scale));
  const h = Math.max(2, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Rec. 601 luma, normalised to 0..1
    gray[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  return { gray, w, h };
}

// Variance of a 4-neighbour Laplacian — the classic "is it in focus?" proxy.
function laplacianVariance(gray, w, h) {
  let mean = 0;
  let n = 0;
  const lap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lap[i] = v;
      mean += v;
      n++;
    }
  }
  mean /= n || 1;
  let variance = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const d = lap[y * w + x] - mean;
      variance += d * d;
    }
  }
  return variance / (n || 1);
}

export function analyzeQuality(bitmap) {
  const { gray, w, h } = grayscaleSample(bitmap);

  // Brightness (mean luma) + contrast (std dev) + clipping fraction.
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < gray.length; i++) {
    sum += gray[i];
    if (gray[i] < 0.02 || gray[i] > 0.98) clipped++;
  }
  const mean = sum / gray.length;
  let varSum = 0;
  for (let i = 0; i < gray.length; i++) {
    const d = gray[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / gray.length);
  const clipFrac = clipped / gray.length;

  // Sharpness: map Laplacian variance through a saturating curve so the
  // 0..100 scale behaves for both phone snaps and tack-sharp studio work.
  const lapVar = laplacianVariance(gray, w, h);
  const sharpness = clamp(100 * (1 - Math.exp(-lapVar / 0.0016)));

  // Exposure: a Gaussian reward around mid-grey, minus a clipping penalty.
  const exposureBase = 100 * Math.exp(-((mean - 0.46) ** 2) / (2 * 0.2 ** 2));
  const exposure = clamp(exposureBase - clipFrac * 140);

  // Contrast: reward a healthy tonal spread, taper if it gets harsh.
  const contrast =
    std <= 0.22 ? clamp((std / 0.22) * 100) : clamp(100 - (std - 0.22) * 180);

  const score = Math.round(0.5 * sharpness + 0.25 * exposure + 0.25 * contrast);
  const label =
    score >= 80 ? "Excellent" : score >= 62 ? "Good" : score >= 42 ? "Fair" : "Needs work";

  return {
    score,
    label,
    sharpness: Math.round(sharpness),
    exposure: Math.round(exposure),
    contrast: Math.round(contrast),
  };
}

export function prettyBytes(n) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

// ---------------------------------------------------------------------
//  Video support
// ---------------------------------------------------------------------

// Grab a representative still frame from a video file. We seek a little way
// in (so we don't capture a black opening frame), draw it to a canvas, and
// return that canvas — which is a drop-in for makeThumb()/analyzeQuality()
// since both just use drawImage + width/height. Also returns the duration.
export async function decodeVideoFrame(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Unsupported or unreadable video"));
    });
    const duration = isFinite(video.duration) ? video.duration : 0;
    const target = Math.min(duration ? duration * 0.1 : 0, 1);
    await new Promise((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = target;
      setTimeout(resolve, 800); // safety net if 'seeked' never fires
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return { bitmap: canvas, width: canvas.width, height: canvas.height, duration };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// "1:07" style label from a number of seconds.
export function formatDuration(sec) {
  if (!sec || !isFinite(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Convert our stored thumbnail (a data URL) back into a Blob, so the AI worker
// can analyze a video by looking at its representative frame.
export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

// ---------------------------------------------------------------------
//  RAW (Canon CR2) support
// ---------------------------------------------------------------------

// Browsers can't decode RAW sensor data, but a CR2 is a TIFF container that
// embeds a full-size JPEG preview. We read the first image directory (IFD#0)
// and pull the JPEG out via its StripOffsets / StripByteCounts tags, then use
// that JPEG for the thumbnail, quality, AI and display. The original .cr2 is
// still kept as the stored asset.
export async function extractCr2Jpeg(file) {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);

  // Byte order marker: "II" (0x4949) = little-endian, "MM" = big-endian.
  const le = view.getUint16(0) === 0x4949;
  const u16 = (o) => view.getUint16(o, le);
  const u32 = (o) => view.getUint32(o, le);
  if (u16(2) !== 42) throw new Error("Not a valid CR2/TIFF file");

  const ifd0 = u32(4);
  const entries = u16(ifd0);
  // A tag's value is inline; SHORT (type 3) uses 2 bytes, LONG (type 4) uses 4.
  const valueOf = (entry) => (u16(entry + 2) === 3 ? u16(entry + 8) : u32(entry + 8));

  let offset = 0;
  let length = 0;
  for (let i = 0; i < entries; i++) {
    const entry = ifd0 + 2 + i * 12;
    const tag = u16(entry);
    if (tag === 0x0111) offset = valueOf(entry); // StripOffsets → preview JPEG
    else if (tag === 0x0117) length = valueOf(entry); // StripByteCounts
  }
  if (!offset || !length) throw new Error("No embedded JPEG preview found in this CR2");

  const bytes = new Uint8Array(buf, offset, length);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Embedded preview isn't a JPEG");
  return new Blob([bytes], { type: "image/jpeg" });
}
