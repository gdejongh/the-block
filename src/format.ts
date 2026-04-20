export const currencyFmt = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export const kmFmt = new Intl.NumberFormat("en-CA");

const COLOR_SWATCHES: Array<[RegExp, string]> = [
  [/burgundy/i, "#6b1f2b"],
  [/bronze/i, "#8c6b3f"],
  [/champagne/i, "#d4be8d"],
  [/orange/i, "#e87722"],
  [/rapid red|red/i, "#b4232c"],
  [/dark green/i, "#1f3a2a"],
  [/green/i, "#2f6f4e"],
  [/midnight blue|dark blue/i, "#0f1e3d"],
  [/blue/i, "#1f4e9d"],
  [/shadow black|crystal black|black/i, "#111316"],
  [/pearl white|glacier white|oxford white|platinum white|white/i, "#f4f4f2"],
  [/magnetic grey|grey|gray/i, "#6a6e73"],
  [/iconic silver|celestial silver|lunar silver|silver/i, "#c3c6cb"],
];

export function colorSwatch(name: string): string {
  for (const [pattern, hex] of COLOR_SWATCHES) {
    if (pattern.test(name)) return hex;
  }
  return "#9ca3af";
}
