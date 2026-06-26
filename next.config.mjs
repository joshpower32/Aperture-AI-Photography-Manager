// The repo name on GitHub. The site is served from
// https://<user>.github.io/<repo>/ , so Next needs this as its base path or
// every asset 404s. If you ever rename the repo, change this in one place.
const repo = "Aperture-AI-Photography-Manager";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a fully static site in ./out (no Node server needed) so it can be
  // hosted on GitHub Pages. Works because this app is 100% client-side.
  output: "export",

  // GitHub Pages serves under a sub-path; tell Next about it.
  basePath: `/${repo}`,
  assetPrefix: `/${repo}`,

  // next/image's optimizer needs a server; disable it for static export.
  // (We use plain <img> tags anyway.)
  images: { unoptimized: true },

  // This project intentionally has no ESLint setup; don't let that fail builds.
  eslint: { ignoreDuringBuilds: true },

  // Transformers.js ships Node-only fallbacks (sharp for image decoding,
  // onnxruntime-node for inference). In the browser we use the WASM/WebGPU
  // runtime instead, so we alias those Node packages away to stop webpack
  // from trying to bundle them.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
