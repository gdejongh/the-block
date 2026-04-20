export const currencyFmt = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export const kmFmt = new Intl.NumberFormat("en-CA");

const COLOR_SWATCHES: Array<{ pattern: RegExp; family: string; hex: string }> = [
  { pattern: /burgundy/i, family: "Burgundy", hex: "#6b1f2b" },
  { pattern: /bronze/i, family: "Bronze", hex: "#8c6b3f" },
  { pattern: /champagne/i, family: "Champagne", hex: "#d4be8d" },
  { pattern: /orange/i, family: "Orange", hex: "#e87722" },
  { pattern: /rapid red|red/i, family: "Red", hex: "#b4232c" },
  { pattern: /dark green/i, family: "Green", hex: "#1f3a2a" },
  { pattern: /green/i, family: "Green", hex: "#2f6f4e" },
  { pattern: /midnight blue|dark blue/i, family: "Blue", hex: "#0f1e3d" },
  { pattern: /blue/i, family: "Blue", hex: "#1f4e9d" },
  { pattern: /shadow black|crystal black|black/i, family: "Black", hex: "#111316" },
  { pattern: /pearl white|glacier white|oxford white|platinum white|white/i, family: "White", hex: "#f4f4f2" },
  { pattern: /magnetic grey|grey|gray/i, family: "Grey", hex: "#6a6e73" },
  { pattern: /iconic silver|celestial silver|lunar silver|silver/i, family: "Silver", hex: "#c3c6cb" },
];

export function colorSwatch(name: string): string {
  for (const { pattern, hex } of COLOR_SWATCHES) {
    if (pattern.test(name)) return hex;
  }
  return "#9ca3af";
}

export function colorFamily(name: string): string {
  for (const { pattern, family } of COLOR_SWATCHES) {
    if (pattern.test(name)) return family;
  }
  return "Other";
}

export const PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#e2e8f0"/><text x="400" y="300" font-family="system-ui,sans-serif" font-size="28" fill="#64748b" text-anchor="middle" dominant-baseline="middle">Photo unavailable</text></svg>',
  );

export function onImageError(e: { currentTarget: HTMLImageElement }): void {
  const img = e.currentTarget;
  if (img.src.startsWith("data:")) return;
  img.src = PHOTO_PLACEHOLDER;
}
