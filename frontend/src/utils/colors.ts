export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function colorDist(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export const COLOR_POOL = [
  "#FF4444","#FF6B35","#FF9F1C","#E63946","#FF006E",
  "#FFD60A","#C8F135","#ADFF2F","#B5E853",
  "#06D6A0","#2DC653","#52B788","#00F5D4",
  "#4CC9F0","#4895EF","#4361EE","#3A86FF","#0096C7","#4EA8DE",
  "#9B5DE5","#C77DFF","#FF6DB6","#FF4FD8","#F72585","#7B2FBE",
  "#FFF3B0","#FFDDD2","#E9C46A","#F4E285",
  "#84CC16","#A3E635","#22C55E","#16A34A","#4ADE80",
  "#F43F5E","#DC2626","#EF4444","#F87171","#FB7185",
  "#EAB308","#FACC15","#FCD34D","#F59E0B","#FBBF24",
  "#A0AEC0","#CBD5E0",
];

export const BG_POOL = [
  "#1a1a2e",
  "#0f172a",
  "#1e1b4b",
  "#1c1917",
  "#14111c",
  "#0d1b2a",
  "#162032",
  "#1a0a0a",
  "#0a1a0a",
  "#1a1505",
  "#0e0e1a",
  "#1f1320",
  "#132a13",
  "#1b2b15",
  "#2b1a10",
  "#2a0f14",
  "#23161a",
];

export function pickDistinctColors(n: number): string[] {
  const shuffled = [...COLOR_POOL].sort(() => Math.random() - 0.5);
  const picked: string[] = [];

  for (const c of shuffled) {
    if (picked.length >= n) break;
    if (picked.every((p) => colorDist(c, p) > 90)) picked.push(c);
  }
  for (const c of shuffled) {
    if (picked.length >= n) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}

export function bestContrastColor(bg: string, candidates: string[]): string {
  return candidates
    .map((c) => ({ c, r: contrastRatio(c, bg) }))
    .sort((a, b) => b.r - a.r)[0]?.c ?? "#FFFFFF";
}
