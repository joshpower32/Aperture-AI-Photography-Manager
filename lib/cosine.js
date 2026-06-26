// Small vector helpers shared by the AI worker and the search ranking.
// CLIP embeddings are compared with cosine similarity; storing them
// pre-normalised means similarity is just a dot product.

export function normalize(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const mag = Math.sqrt(sum) || 1;
  const out = new Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / mag;
  return out;
}

// Dot product. When both inputs are unit vectors this equals cosine similarity.
export function dot(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
