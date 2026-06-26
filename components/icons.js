// Minimal inline icon set (stroke-based, inherits currentColor) so the app
// ships with zero icon dependencies.
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Icon = {
  Search: (p) => (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Upload: (p) => (
    <svg {...base} {...p}>
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
  Close: (p) => (
    <svg {...base} {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Chevron: (p) => (
    <svg {...base} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Left: (p) => (
    <svg {...base} {...p}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  Right: (p) => (
    <svg {...base} {...p}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...base} {...p}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  ),
  Star: (p) => (
    <svg {...base} {...p}>
      <path d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 5.9L12 17.2 6.7 19.9l1.1-5.9L3.4 9.8 9.4 9z" />
    </svg>
  ),
  Sparkles: (p) => (
    <svg {...base} {...p}>
      <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5L14 8m-4 8-2.5 2.5m9 0L14 16m-4-8L7.5 5.5" />
    </svg>
  ),
  Kebab: (p) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </svg>
  ),
  Refresh: (p) => (
    <svg {...base} {...p}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v5h-5" />
    </svg>
  ),
  Folder: (p) => (
    <svg {...base} {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  Plus: (p) => (
    <svg {...base} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Edit: (p) => (
    <svg {...base} {...p}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  Images: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
};
