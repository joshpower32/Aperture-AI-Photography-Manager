"use client";

import { useDam } from "./DamProvider";
import { Icon } from "./icons";

export default function Navbar() {
  const { modelsReady, modelMsg, modelProgress, processingCount } = useDam();

  const busy = processingCount > 0 || (modelMsg && modelProgress !== null);
  let label = "AI idle";
  if (processingCount > 0) label = `Analyzing ${processingCount} photo${processingCount > 1 ? "s" : ""}`;
  else if (modelMsg) label = modelMsg;
  else if (modelsReady) label = "AI ready";

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-bg">
            <Icon.Images width={20} height={20} strokeWidth={2} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-xl tracking-wide text-cream">
              Aperture<span className="text-accent">.</span>
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">
              AI Photography Manager
            </span>
          </span>
        </a>

        <div
          className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs ${
            busy
              ? "border-accent/40 bg-accent/10 text-accent-hi"
              : modelsReady
                ? "border-good/30 bg-good/10 text-good"
                : "border-line bg-card text-muted"
          }`}
          title="All AI runs locally in your browser — photos never leave your device."
        >
          <span className="relative flex h-2 w-2">
            {busy && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                busy ? "bg-accent" : modelsReady ? "bg-good" : "bg-faint"
              }`}
            />
          </span>
          <span className="max-w-[200px] truncate">{label}</span>
          {modelProgress !== null && <span className="tabular-nums">{modelProgress}%</span>}
        </div>
      </div>
    </nav>
  );
}
