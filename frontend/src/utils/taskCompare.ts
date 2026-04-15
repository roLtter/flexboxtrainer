import type { TaskConfig, BoxConfig } from "./types";

function styles(el: Element): Record<string, string> {
  const s = (el as HTMLElement).style;
  const map: Record<string, string> = {};
  for (let i = 0; i < s.length; i++) {
    const prop = s[i];
    map[prop] = s.getPropertyValue(prop).trim().toLowerCase();
  }
  return map;
}

function normColor(v: string): string {
  v = v.trim().toLowerCase().replace(/\s+/g, "");
  const rgb = v.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
  if (rgb) {
    return "#" + [rgb[1], rgb[2], rgb[3]]
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("");
  }
  return v;
}

function normPx(v: string): number {
  return parseFloat(v) || 0;
}

function colorMatch(a: string, b: string): boolean {
  const na = normColor(a);
  const nb = normColor(b);
  if (na === nb) return true;
  const ha = na.match(/^#([0-9a-f]{6})$/);
  const hb = nb.match(/^#([0-9a-f]{6})$/);
  if (!ha || !hb) return false;
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1,g1,b1] = parse(ha[1]);
  const [r2,g2,b2] = parse(hb[1]);
  return Math.abs(r1-r2) + Math.abs(g1-g2) + Math.abs(b1-b2) < 12;
}

function pxMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 3;
}

function findContainerAndBoxes(doc: Document): {
  container: Element;
  boxes: Element[];
} | null {
  const allDivs = Array.from(doc.body.querySelectorAll("*"));
  const container = allDivs.find((el) => {
    const s = (el as HTMLElement).style;
    const d = s.display || "";
    return d === "flex" || d === "inline-flex" || el.className?.toString().includes("flex");
  });
  if (!container) return null;

  const boxes = Array.from(container.children);
  return { container, boxes };
}

class Score {
  hits = 0;
  total = 0;

  check(_label: string, pass: boolean, weight = 1) {
    this.total += weight;
    if (pass) this.hits += weight;
  }

  pct(): number {
    if (this.total === 0) return 0;
    return Math.round((this.hits / this.total) * 100);
  }
}

function scoreContainer(el: Element, task: TaskConfig, sc: Score) {
  const s = styles(el);

  sc.check("flex-direction", (s["flex-direction"] ?? "row") === task.flexDirection, 2);
  const jc = s["justify-content"] ?? "flex-start";
  sc.check("justify-content", jc === task.justifyContent, 2);
  const ai = s["align-items"] ?? "stretch";
  sc.check("align-items", ai === task.alignItems, 2);
  const bg = s["background"] ?? s["background-color"] ?? "";
  sc.check("background", colorMatch(bg, task.bgColor), 2);
  const w = normPx(s["width"] ?? "0");
  sc.check("width", pxMatch(w, task.gapMode.containerWidth), 2);
  const h = normPx(s["height"] ?? "0");
  sc.check("height", pxMatch(h, task.gapMode.containerHeight), 2);
  if (task.gapMode.kind === "fixed") {
    const gap = normPx(s["gap"] ?? s["column-gap"] ?? s["row-gap"] ?? "0");
    sc.check("gap", pxMatch(gap, task.gapMode.gap), 1);
    const pTop = normPx(s["padding-top"] ?? s["padding"] ?? "0");
    const pLeft = normPx(s["padding-left"] ?? s["padding"] ?? "0");
    sc.check("padding-y", pxMatch(pTop, task.gapMode.py), 1);
    sc.check("padding-x", pxMatch(pLeft, task.gapMode.px), 1);
  }
}

function scoreBox(el: Element, box: BoxConfig, sc: Score) {
  const s = styles(el);
  sc.check("box-width", pxMatch(normPx(s["width"] ?? "0"), box.width), 2);
  sc.check("box-height", pxMatch(normPx(s["height"] ?? "0"), box.height), 2);
  const bg = s["background"] ?? s["background-color"] ?? "";
  sc.check("box-bg", colorMatch(bg, box.bgColor), 2);
  if (box.borderRadius > 0) {
    const br = normPx(s["border-radius"] ?? "0");
    sc.check("box-radius", pxMatch(br, box.borderRadius), 1);
  }
  if (box.borderWidth > 0 && box.borderStyle !== "none") {
    const bw = normPx(s["border-width"] ?? (s["border"] ? s["border"].match(/(\d+)px/)?.[1] ?? "0" : "0"));
    sc.check("box-border-width", pxMatch(bw, box.borderWidth), 1);
    const bs = s["border-style"] ?? (s["border"] ? (s["border"].includes("dashed") ? "dashed" : s["border"].includes("dotted") ? "dotted" : "solid") : "");
    sc.check("box-border-style", bs === box.borderStyle, 1);
    const bcolor = s["border-color"] ?? "";
    sc.check("box-border-color", colorMatch(bcolor, box.borderColor), 1);
  }
  if (box.text) {
    const textEl = el.querySelector("span, p, div:not([style])") ?? el;
    const textContent = textEl.textContent?.trim() ?? "";
    sc.check("box-text", textContent.includes(box.text.content), 1);
    const tc = s["color"] ?? (textEl as HTMLElement).style?.color ?? "";
    sc.check("box-text-color", colorMatch(tc, box.text.color), 1);
  }
  if (box.svg) {
    const img = el.querySelector("img");
    sc.check("box-svg-present", !!img, 1);
    if (img) {
      const sw = normPx(img.getAttribute("width") ?? "0");
      sc.check("box-svg-size", pxMatch(sw, box.svg.size), 1);
    }
  }
}

export function compareToTask(userCode: string, mode: "html" | "tsx", task: TaskConfig): number {
  const html = mode === "tsx"
    ? userCode
        .replace(/className=/g, "class=")
        .replace(/style=\{\{/g, 'style="')
        .replace(/\}\}/g, '"')
        .replace(/=\{([^}]+)\}/g, '="$1"')
        .replace(/<>/g, "<div>")
        .replace(/<\/>/g, "</div>")
    : userCode;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<html><body>${html}</body></html>`, "text/html");

  const found = findContainerAndBoxes(doc);
  if (!found) return 0;

  const { container, boxes: userBoxes } = found;
  const sc = new Score();

  scoreContainer(container, task, sc);

  const maxBoxes = Math.max(userBoxes.length, task.boxes.length);
  for (let i = 0; i < maxBoxes; i++) {
    const userBox = userBoxes[i];
    const taskBox = task.boxes[i];
    if (!userBox || !taskBox) {
      sc.total += 8;
      continue;
    }
    scoreBox(userBox, taskBox, sc);
  }

  return sc.pct();
}
