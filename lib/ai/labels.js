// Candidate vocabulary for zero-shot auto-tagging.
//
// On first run the worker encodes every phrase below with CLIP's text
// encoder once, caches the vectors, then tags each photo by cosine
// similarity between its image embedding and these label embeddings.
// The bare `tag` is what we store/show; the `prompt` is what CLIP sees
// ("a photo of ...") which measurably improves zero-shot accuracy.

export const TAG_VOCAB = [
  // Genre / subject
  "portrait",
  "landscape",
  "cityscape",
  "street photography",
  "wildlife",
  "macro",
  "architecture",
  "still life",
  "food",
  "product photography",
  "fashion",
  "wedding",
  "event",
  "sports",
  "astrophotography",
  "aerial / drone",
  "documentary",
  "abstract",
  "black and white",

  // Scene
  "beach",
  "mountains",
  "forest",
  "desert",
  "ocean",
  "lake",
  "waterfall",
  "snow",
  "sunset",
  "sunrise",
  "night sky",
  "city at night",
  "interior",
  "garden",

  // Subjects
  "a person",
  "a group of people",
  "a child",
  "a dog",
  "a cat",
  "a bird",
  "a car",
  "a building",
  "flowers",
  "trees",
  "water",
  "clouds",
  "food on a plate",

  // Light & mood
  "golden hour light",
  "dramatic lighting",
  "soft natural light",
  "high contrast",
  "moody and dark",
  "bright and airy",
  "silhouette",
  "long exposure",
  "bokeh background",

  // Color
  "vibrant colors",
  "muted colors",
  "warm tones",
  "cool tones",
];

// Map a few raw phrases to a cleaner display tag.
export function displayTag(tag) {
  return tag
    .replace(/^a photo of /, "")
    .replace(/^a /, "")
    .replace(/^an /, "");
}
