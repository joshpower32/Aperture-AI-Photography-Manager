// The repo name on GitHub. The live site is served from
// https://<user>.github.io/<repo>/ , so the production build needs this as its
// base path or every asset 404s. If you rename the repo, change it here.
const repo = "Aperture-AI-Photography-Manager";

// Only apply the base path for production builds (GitHub Pages). In local
// `npm run dev` we leave it empty so the app stays at http://localhost:3000.
const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a fully static site in ./out (no Node server needed) so it can be
  // hosted on GitHub Pages. Works because this app is 100% client-side.
  output: "export",

  // GitHub Pages serves under a sub-path; tell the production build about it.
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}` : "",

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
