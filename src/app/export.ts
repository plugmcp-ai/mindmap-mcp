import { toMarkdown } from "../model/outline.js";
import type { Doc } from "../model/schema.js";
import type { Host } from "./host.js";

export type ExportFormat = "svg" | "png" | "json" | "md";

/** Turn a CSS value that may hold var(--x) into the color or font the browser really uses. */
function resolve(value: string, property: "color" | "fontFamily"): string {
  if (!value.includes("var(")) return value;
  const probe = document.createElement("span");
  probe.style[property] = value;
  document.body.append(probe);
  const out = getComputedStyle(probe)[property];
  probe.remove();
  return out || value;
}

/** A standalone SVG file: no variables, its own background and font. */
export function svgText(snapshot: SVGSVGElement, background: string, font: string): string {
  for (const element of snapshot.querySelectorAll("*")) {
    for (const name of ["fill", "stroke"]) {
      const value = element.getAttribute(name);
      if (value?.includes("var(")) element.setAttribute(name, resolve(value, "color"));
    }
  }
  snapshot.setAttribute("style", `font-family: ${resolve(font, "fontFamily").replace(/"/g, "'")}`);
  const box = (snapshot.getAttribute("viewBox") ?? "0 0 100 100").split(" ").map(Number);
  const paper = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  paper.setAttribute("x", String(box[0]));
  paper.setAttribute("y", String(box[1]));
  paper.setAttribute("width", String(box[2]));
  paper.setAttribute("height", String(box[3]));
  paper.setAttribute("fill", resolve(background, "color"));
  snapshot.insertBefore(paper, snapshot.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(snapshot)}`;
}

/** Draw the SVG onto a canvas at twice its size and read it back as a PNG data URL. */
export async function pngDataUrl(svg: string, width: number, height: number): Promise<string> {
  const image = new Image();
  // A data URL, not a blob: the frame's content policy allows data images only.
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((done, failed) => {
    image.onload = () => done();
    image.onerror = () => failed(new Error("The picture could not be drawn."));
    image.src = source;
  });
  const scale = Math.min(2, 8000 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

const MIME: Record<ExportFormat, string> = { svg: "image/svg+xml", png: "image/png", json: "application/json", md: "text/markdown" };

/**
 * Give the user a file. A chat client that can download gets the file directly.
 * Otherwise the server writes it to the diagrams folder and the path is shown.
 */
export async function exportDiagram(
  format: ExportFormat,
  input: { host: Host; doc: Doc; docId: string | undefined; snapshot: () => SVGSVGElement | null; background: string; font: string },
): Promise<string> {
  const { host, doc, docId } = input;
  const name = `${doc.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "diagram"}.${format}`;
  let text: string | undefined;
  let base64: string | undefined;
  let data: string | undefined;
  if (format === "json") text = JSON.stringify(doc, null, 2);
  else if (format === "md") text = toMarkdown(doc);
  else {
    const snapshot = input.snapshot();
    if (!snapshot) throw new Error("Nothing to export yet.");
    const width = Number(snapshot.getAttribute("width"));
    const height = Number(snapshot.getAttribute("height"));
    const svg = svgText(snapshot, input.background, input.font);
    if (format === "svg") {
      text = svg;
      data = svg;
    } else {
      data = await pngDataUrl(svg, width, height);
      base64 = data.slice(data.indexOf(",") + 1);
    }
  }
  if (host.download && (await host.download({ name, mimeType: MIME[format], text, base64 }).catch(() => false))) return `Downloaded ${name}`;
  if (!docId) throw new Error("This diagram is not saved yet.");
  const result = await host.callTool("export", { docId, format, ...(data ? { data } : {}) });
  if (result.isError) throw new Error(result.text || "The export failed.");
  return result.text;
}
