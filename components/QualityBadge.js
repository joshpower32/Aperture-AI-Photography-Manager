import { Icon } from "./icons";

export function qualityColor(score) {
  if (score >= 80) return { text: "text-good", ring: "ring-good/40", bg: "bg-good/15" };
  if (score >= 62) return { text: "text-accent-hi", ring: "ring-accent/40", bg: "bg-accent/15" };
  if (score >= 42) return { text: "text-[#d6a85a]", ring: "ring-[#d6a85a]/40", bg: "bg-[#d6a85a]/15" };
  return { text: "text-danger", ring: "ring-danger/40", bg: "bg-danger/15" };
}

export default function QualityBadge({ quality, withLabel = false, size = "sm" }) {
  if (!quality) return null;
  const c = qualityColor(quality.score);
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${c.bg} ${c.text} ${c.ring} ${pad}`}
      title={`Composition score: ${quality.score}/100 (${quality.label})`}
    >
      <Icon.Star width={12} height={12} strokeWidth={2} />
      {quality.score}
      {withLabel && <span className="font-normal opacity-80">· {quality.label}</span>}
    </span>
  );
}
