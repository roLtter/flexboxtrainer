const COLOR_THEMES = [
  {
    containerCandidates: ["#3b0764", "#4a044e", "#581c87"],
    hue: 315,
    accent: "#d946ef",
    accentSoft: "#f0abfc",
  },
  {
    containerCandidates: ["#1e3a8a", "#1d4ed8", "#312e81"],
    hue: 205,
    accent: "#38bdf8",
    accentSoft: "#7dd3fc",
  },
  {
    containerCandidates: ["#14532d", "#065f46", "#134e4a"],
    hue: 155,
    accent: "#34d399",
    accentSoft: "#6ee7b7",
  },
  {
    containerCandidates: ["#7c2d12", "#9a3412", "#7f1d1d"],
    hue: 24,
    accent: "#fb923c",
    accentSoft: "#fdba74",
  },
  {
    containerCandidates: ["#3730a3", "#4338ca", "#5b21b6"],
    hue: 250,
    accent: "#818cf8",
    accentSoft: "#a5b4fc",
  },
  {
    containerCandidates: ["#14532d", "#166534", "#365314"],
    hue: 110,
    accent: "#4ade80",
    accentSoft: "#86efac",
  },
  {
    containerCandidates: ["#7f1d1d", "#991b1b", "#881337"],
    hue: 0,
    accent: "#f87171",
    accentSoft: "#fca5a5",
  },
  {
    containerCandidates: ["#78350f", "#854d0e", "#713f12"],
    hue: 48,
    accent: "#facc15",
    accentSoft: "#fde68a",
  },
];

const SVG_ICON_NAMES = [
  "Search", "Bell", "User", "Home", "Settings", "Cart", "Heart",
  "Mail", "Star", "Play", "Bookmark", "Camera", "Lock", "Trash",
  "Plus", "Download", "Share", "Map", "ChevronRight", "Edit",
];

const TEXT_SAMPLES = [
  "Hello", "Submit", "Cancel", "Login", "Sign up", "Dashboard", "Profile",
  "Settings", "Explore", "Continue", "Done", "Back", "Next", "Save",
  "Edit", "Delete", "Share", "Follow", "Like", "View all", "Learn more",
  "Home", "About", "Contact", "Projects", "Blog", "New", "Open", "Close",
];

const SVG_ALIGNMENTS = [
  ["center", "center"],
  ["flex-start", "flex-start"],
  ["flex-start", "flex-end"],
  ["flex-end", "flex-start"],
  ["flex-end", "flex-end"],
  ["flex-start", "center"],
  ["flex-end", "center"],
  ["center", "flex-start"],
  ["center", "flex-end"],
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = (arr) => arr[rand(0, arr.length - 1)];
const estimateTextWidth = (text, fs) => text.length * fs * 0.62;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function bestContrastColor(bg, candidates) {
  return candidates
    .map((c) => ({ c, r: contrastRatio(c, bg) }))
    .sort((a, b) => b.r - a.r)[0]?.c ?? "#FFFFFF";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hslToHex(h, s, l) {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildThemeVariants(theme, count = 50) {
  const startL = rand(26, 40);
  const step = (68 - startL) / Math.max(1, count - 1);
  const variants = [];
  for (let i = 0; i < count; i++) {
    const lightness = startL + step * i + rand(-2, 2);
    const saturation = rand(62, 86);
    const hue = theme.hue + rand(-12, 12);
    variants.push(hslToHex(hue, saturation, lightness));
  }
  return variants;
}

function pickContainerSize(minSize, preferredSize, maxSize) {
  if (minSize > maxSize) return maxSize;
  const safePreferred = Math.max(minSize, preferredSize);
  return Math.min(safePreferred, maxSize);
}

function fitBoxesToContainer(boxes, isRow, maxContainerWidth, maxContainerHeight, fixedGap = null) {
  const mainLimit = isRow ? maxContainerWidth : maxContainerHeight;
  const crossLimit = isRow ? maxContainerHeight : maxContainerWidth;
  const mainPadding = fixedGap ? (isRow ? fixedGap.px * 2 : fixedGap.py * 2) : 0;
  const crossPadding = fixedGap ? (isRow ? fixedGap.py * 2 : fixedGap.px * 2) : 0;
  const totalGaps = fixedGap ? fixedGap.gap * (boxes.length - 1) : 0;

  const availableMain = Math.max(40, mainLimit - mainPadding - totalGaps);
  const availableCross = Math.max(40, crossLimit - crossPadding);
  const mainTotal = boxes.reduce((s, b) => s + (isRow ? b.width : b.height), 0);
  const crossMax = Math.max(...boxes.map((b) => (isRow ? b.height : b.width)));

  const mainScale = mainTotal > availableMain ? availableMain / mainTotal : 1;
  const crossScale = crossMax > availableCross ? availableCross / crossMax : 1;

  if (mainScale >= 1 && crossScale >= 1) return boxes;

  return boxes.map((box) => {
    const newMain = Math.max(32, Math.floor((isRow ? box.width : box.height) * mainScale));
    const newCross = Math.max(32, Math.floor((isRow ? box.height : box.width) * crossScale));
    return isRow
      ? { ...box, width: newMain, height: newCross }
      : { ...box, width: newCross, height: newMain };
  });
}

export function generateTask(maxContainerWidth = 560, maxContainerHeight = 280) {
  const theme = randItem(COLOR_THEMES);
  const bgColor = randItem(theme.containerCandidates);
  const variants = buildThemeVariants(theme, 50);
  const boxCount = rand(2, 5);
  const flexDirection = randItem(["row", "column", "row-reverse", "column-reverse"]);
  const alignItems = randItem(["flex-start", "flex-end", "center"]);

  const useAutoGap = Math.random() < 0.5;
  const autoJustify = ["space-between", "space-around", "space-evenly"];
  const fixedJustify = ["flex-start", "flex-end", "center"];
  const justifyContent = useAutoGap ? randItem(autoJustify) : randItem(fixedJustify);
  const containerRadius = rand(5, 10);

  const svgKeys = [...SVG_ICON_NAMES];
  const usedSvgNames = [];

  const startIndex = rand(0, Math.max(0, variants.length - boxCount - 1));
  const boxColorSequence = Array.from({ length: boxCount }, (_, i) => variants[startIndex + i]);

  const initialBoxes = Array.from({ length: boxCount }, (_, boxIndex) => {
    const w = rand(48, 160);
    const h = rand(48, 140);
    const roll = Math.random();
    const hasSvg = roll < 0.30;
    const hasText = !hasSvg && roll < 0.62;
    const primaryColor = boxColorSequence[boxIndex];
    const neighborColor = boxColorSequence[Math.min(boxColorSequence.length - 1, boxIndex + 1)];
    const useCssGradient = Math.random() < 0.1;
    const boxBg = useCssGradient
      ? `linear-gradient(135deg,${primaryColor},${neighborColor})`
      : primaryColor;
    const borderRadius = randItem([0, 0, 4, 6, 8, 12, 16, 24, 50]);

    const svgPad = borderRadius > 8 ? Math.round(borderRadius / 2) : 0;
    const innerW = Math.max(0, w - svgPad * 2 - 4);
    const innerH = Math.max(0, h - svgPad * 2 - 4);
    const svgMaxByParent = Math.floor(Math.min(w, h) / 2);
    const svgMaxSize = Math.min(svgMaxByParent, innerW, innerH);

    let svg;
    if (hasSvg && svgMaxSize >= 14) {
      const available = svgKeys.filter((k) => !usedSvgNames.includes(k));
      const name = available.length > 0 ? randItem(available) : randItem(svgKeys);
      if (!usedSvgNames.includes(name)) usedSvgNames.push(name);
      const size = rand(14, svgMaxSize);
      const [ai, jc] = randItem(SVG_ALIGNMENTS);
      svg = {
        name,
        color: bestContrastColor(bgColor, [theme.accentSoft, "#ffffff"]),
        size,
        alignItems: ai,
        justifyContent: jc,
        padding: svgPad,
      };
    }

    let text;
    if (hasText) {
      const content = randItem(TEXT_SAMPLES);
      const allSizes = [11, 13, 15, 18, 22, 28, 36];
      const fitting = allSizes.filter(
        (fs) => estimateTextWidth(content, fs) <= w - 8 && fs * 1.5 <= h - 8,
      );
      const fontSize = fitting.length > 0 ? randItem(fitting) : 11;
      text = {
        content,
        color: bestContrastColor(bgColor, [theme.accentSoft, "#ffffff"]),
        fontSize,
        fontWeight: randItem([400, 600, 700]),
      };
    }

    const borderWidth = randItem([0, 0, 2, 3]);
    const borderStyle = borderWidth > 0 ? randItem(["solid", "dashed", "dotted"]) : "none";

    return {
      id: "b-" + Math.random().toString(36).slice(2, 7),
      width: w,
      height: h,
      bgColor: boxBg,
      borderWidth,
      borderColor: borderWidth > 0 ? theme.accent : "#000000",
      borderRadius,
      borderStyle,
      text,
      svg,
    };
  });

  const isRow = flexDirection === "row" || flexDirection === "row-reverse";

  let gapMode;
  let boxes = initialBoxes;

  if (useAutoGap) {
    boxes = fitBoxesToContainer(initialBoxes, isRow, maxContainerWidth, maxContainerHeight, null);
    const mainTotal = boxes.reduce((s, b) => s + (isRow ? b.width : b.height), 0);
    const crossMax = Math.max(...boxes.map((b) => (isRow ? b.height : b.width)));
    const factor = 1.4 + Math.random() * 0.4;
    const cMain = Math.round(mainTotal * factor);
    const cCross = crossMax + rand(16, 40);
    const minMain = mainTotal;
    const minCross = crossMax;
    gapMode = {
      kind: "auto",
      containerWidth: pickContainerSize(
        isRow ? minMain : minCross,
        isRow ? cMain : cCross,
        maxContainerWidth,
      ),
      containerHeight: pickContainerSize(
        isRow ? minCross : minMain,
        isRow ? cCross : cMain,
        maxContainerHeight,
      ),
    };
  } else {
    const gap = rand(6, 32);
    const px = rand(8, 24);
    const py = rand(8, 24);
    boxes = fitBoxesToContainer(initialBoxes, isRow, maxContainerWidth, maxContainerHeight, { gap, px, py });
    const mainTotal = boxes.reduce((s, b) => s + (isRow ? b.width : b.height), 0);
    const crossMax = Math.max(...boxes.map((b) => (isRow ? b.height : b.width)));
    const totalGaps = gap * (boxes.length - 1);
    const minMain = mainTotal + totalGaps + (isRow ? px * 2 : py * 2);
    const minCross = crossMax + (isRow ? py * 2 : px * 2);
    const extraMain = rand(20, 60);
    const extraCross = rand(10, 30);
    gapMode = {
      kind: "fixed",
      gap,
      px,
      py,
      containerWidth: pickContainerSize(
        isRow ? minMain : minCross,
        isRow ? minMain + extraMain : minCross + extraCross,
        maxContainerWidth,
      ),
      containerHeight: pickContainerSize(
        isRow ? minCross : minMain,
        isRow ? minCross + extraCross : minMain + extraMain,
        maxContainerHeight,
      ),
    };
  }

  return { gapMode, flexDirection, justifyContent, alignItems, bgColor, containerRadius, boxes, svgNames: usedSvgNames };
}
